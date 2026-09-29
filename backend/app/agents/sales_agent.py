"""
DealMind Sales Agent — orchestrates the full Remember→Recall→Recommend→Learn loop.

Workflow for every interaction:
  1. Receive salesperson message + deal context
  2. Recall relevant memories from Hindsight (what do we know about this deal?)
  3. Send: current message + deal context + memories → LLM
  4. Generate sales recommendation
  5. Store this interaction in Hindsight (what was said + what we recommended)
  6. Return: recommendation + memories used + metadata
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.services import hindsight_service, llm_service

logger = logging.getLogger(__name__)


async def process_interaction(
    deal: dict[str, Any],
    message: str,
    conversation_history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """
    Main agent entry point.

    Args:
        deal: Deal model as dict (id, bank_id, customer_name, title, …)
        message: Salesperson's question or note
        conversation_history: Prior turns in this chat session

    Returns {
        recommendation: str,
        recalled_memories: list[dict],
        memory_count: int,
        hindsight_available: bool,
        hindsight_doc_id: str,
        error: str | None,
    }
    """
    bank_id = deal["bank_id"]
    doc_id = f"interaction-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"

    # ── Step 1: Recall relevant memories ─────────────────────────────────
    recall_result = await hindsight_service.recall_deal_context(
        bank_id=bank_id,
        query=message,
        budget="mid",
        max_tokens=3000,
    )
    recalled_memories = recall_result["memories"]
    hindsight_available = recall_result["available"]

    # ── Step 2: Generate recommendation with LLM ─────────────────────────
    llm_result = await llm_service.generate_recommendation(
        current_message=message,
        deal_context=deal,
        recalled_memories=recalled_memories,
        conversation_history=conversation_history,
    )
    recommendation = llm_result["recommendation"]

    # ── Step 3: Store interaction in Hindsight ────────────────────────────
    # Build a rich memory string capturing the full interaction
    interaction_content = _build_memory_content(
        deal=deal,
        message=message,
        recommendation=recommendation,
        recalled_count=len(recalled_memories),
    )

    retain_result = await hindsight_service.retain_interaction(
        bank_id=bank_id,
        content=interaction_content,
        context=_classify_context(message),
        document_id=doc_id,
        timestamp=datetime.now(timezone.utc),
    )

    if not retain_result["success"]:
        logger.warning("Memory store failed: %s", retain_result["error"])

    return {
        "recommendation": recommendation,
        "recalled_memories": recalled_memories,
        "memory_count": len(recalled_memories),
        "hindsight_available": hindsight_available,
        "hindsight_doc_id": doc_id,
        "memory_stored": retain_result["success"],
        "error": llm_result.get("error"),
    }


async def store_customer_update(
    bank_id: str,
    customer_name: str,
    update_text: str,
    context: str = "customer_update",
) -> dict[str, Any]:
    """
    Store a customer update (objection, feedback, news) directly as a memory.
    Used when the salesperson logs a new piece of information.
    """
    doc_id = f"update-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
    content = f"Customer {customer_name} update: {update_text}"
    return await hindsight_service.retain_interaction(
        bank_id=bank_id,
        content=content,
        context=context,
        document_id=doc_id,
        timestamp=datetime.now(timezone.utc),
    )


async def run_demo_interaction(
    deal: dict[str, Any],
    interaction_number: int,
) -> dict[str, Any]:
    """
    Run a pre-scripted demo interaction that showcases Hindsight learning.
    Interaction 1 → generic, Interaction 5 → personalized, Interaction 20 → deep context.
    """
    scripts = _get_demo_scripts(deal)
    script = scripts.get(interaction_number, scripts[1])

    # First store all prior context for this demo stage
    if interaction_number >= 5:
        for mem in script.get("seed_memories", []):
            await hindsight_service.retain_interaction(
                bank_id=deal["bank_id"],
                content=mem["content"],
                context=mem["context"],
                document_id=f"demo-seed-{interaction_number}-{uuid.uuid4().hex[:6]}",
            )

    # Now run the actual interaction
    result = await process_interaction(
        deal=deal,
        message=script["message"],
        conversation_history=None,
    )
    result["demo_message"] = script["message"]
    result["demo_label"] = script["label"]
    return result


# ── Private helpers ──────────────────────────────────────────────────────────

def _build_memory_content(
    deal: dict[str, Any],
    message: str,
    recommendation: str,
    recalled_count: int,
) -> str:
    """Build a rich, searchable memory string for this interaction."""
    return (
        f"Salesperson ({deal['salesperson_name']}) asked about deal with "
        f"{deal['customer_name']} at {deal['customer_company']}: {message}\n"
        f"DealMind recommendation provided (based on {recalled_count} recalled memories): "
        f"{recommendation[:300]}{'...' if len(recommendation) > 300 else ''}"
    )


def _classify_context(message: str) -> str:
    """Classify the message to set a Hindsight context label."""
    lower = message.lower()
    if any(w in lower for w in ["objection", "concern", "worry", "issue", "problem"]):
        return "customer_objection"
    if any(w in lower for w in ["budget", "cost", "price", "expensive", "afford"]):
        return "budget_discussion"
    if any(w in lower for w in ["competitor", "alternative", "other vendor", "evaluating"]):
        return "competitor_mention"
    if any(w in lower for w in ["next step", "next meeting", "prepare", "follow-up"]):
        return "next_steps"
    if any(w in lower for w in ["timeline", "deadline", "when", "schedule", "implementation"]):
        return "timeline_discussion"
    if any(w in lower for w in ["decision", "stakeholder", "cto", "ceo", "board"]):
        return "decision_making"
    return "sales_interaction"


def _get_demo_scripts(deal: dict[str, Any]) -> dict[int, dict[str, Any]]:
    customer = deal.get("customer_name", "the customer")
    company = deal.get("customer_company", "the company")

    return {
        1: {
            "label": "Interaction 1 — First Contact",
            "message": f"I just had my first call with {customer} at {company}. She mentioned that implementation time is a major concern for their team. How should I handle this?",
            "seed_memories": [],
        },
        5: {
            "label": "Interaction 5 — Building Context",
            "message": f"How should I prepare for my next meeting with {customer}? We've had several conversations now.",
            "seed_memories": [
                {
                    "content": f"{customer} at {company} stated: 'Implementation time is a major concern — we can't afford a 6-month disruption.'",
                    "context": "customer_objection",
                },
                {
                    "content": f"{customer} mentioned their budget is fixed for this fiscal year — approved budget is $85,000 maximum.",
                    "context": "budget_discussion",
                },
                {
                    "content": f"{company} is also evaluating TechRival Pro and DataStream Enterprise as competing solutions.",
                    "context": "competitor_mention",
                },
                {
                    "content": f"Proposed a phased implementation approach to {customer}: Phase 1 in 6 weeks, Phase 2 in 3 months. She responded positively and said this 'makes it much more manageable.'",
                    "context": "customer_objection",
                },
                {
                    "content": f"{customer}'s primary decision maker is the CTO, who has final sign-off authority. {customer} is the technical evaluator.",
                    "context": "decision_making",
                },
            ],
        },
        20: {
            "label": "Interaction 20 — Deep Context",
            "message": f"It's been several weeks of conversations with {customer}. Based on everything we know about this deal, what's the best approach to finally close it?",
            "seed_memories": [
                {
                    "content": f"Successful approach: {customer} responded very positively to phased rollout plan. Reduce initial risk perception.",
                    "context": "successful_approach",
                },
                {
                    "content": f"{customer} prefers email communication over calls — responds to emails within 2 hours, often takes 2 days to respond to calendar invites.",
                    "context": "communication_preference",
                },
                {
                    "content": f"Recurring concern: implementation time. Addressed with phased approach. Do not reopen this — it's been resolved.",
                    "context": "customer_objection",
                },
                {
                    "content": f"TechRival Pro weakness: they don't offer dedicated onboarding support. Our differentiator is the 90-day success program.",
                    "context": "competitor_mention",
                },
                {
                    "content": f"{customer} mentioned budget approved is $85K. Our proposal is $80K — we have $5K room. Don't discount unless necessary.",
                    "context": "budget_discussion",
                },
                {
                    "content": f"CTO wants a 2-page executive summary, not a full demo. {customer} confirmed this preference last week.",
                    "context": "decision_making",
                },
                {
                    "content": f"Previous recommendation: send a detailed ROI calculator. {customer} found this 'exactly what we needed' — she shared it with the CTO.",
                    "context": "successful_approach",
                },
                {
                    "content": f"Failed approach: attempted to accelerate timeline by offering an early-close discount. {customer} felt pressured and went quiet for a week.",
                    "context": "failed_approach",
                },
            ],
        },
    }
