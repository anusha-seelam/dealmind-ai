"""
LLM service — generates AI sales recommendations.

Works with any OpenAI-compatible provider: Groq, OpenAI, Together, etc.
Falls back to a smart context-aware response when no valid API key is set,
so the full demo flow works even without an LLM key.
"""

import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_PROVIDER_URLS: dict[str, str] = {
    "openai":     "https://api.openai.com/v1",
    "groq":       "https://api.groq.com/openai/v1",
    "together":   "https://api.together.xyz/v1",
    "openrouter": "https://openrouter.ai/api/v1",
}

SYSTEM_PROMPT = """You are DealMind AI, an elite B2B sales coach and strategist.

You help salespeople close complex enterprise deals by providing highly specific,
context-aware recommendations based on what you know about their deals and customers.

Your role:
- Analyze the current situation and recalled memories from past interactions
- Give concrete, actionable next steps
- Reference specific customer concerns, past conversations, and deal dynamics
- Highlight what has worked and what has not based on deal history

Rules:
- Be specific — reference actual customer names, objections, and past events from the memories provided
- If no memory exists, give solid general sales advice but flag the lack of context
- Keep responses focused with 3-5 key points
- Do NOT fabricate customer history — only use what is provided in the context
- Format with clear headers and bullet points for easy scanning"""


def _has_valid_key() -> bool:
    """Check if we have a real API key (not the placeholder)."""
    key = settings.llm_api_key or ""
    return bool(key) and key != "PASTE_YOUR_GROQ_API_KEY_HERE" and not key.startswith("PASTE")


async def generate_recommendation(
    current_message: str,
    deal_context: dict[str, Any],
    recalled_memories: list[dict[str, Any]],
    conversation_history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """
    Generate a sales recommendation using the LLM.
    Falls back to a smart demo response if no valid API key is configured.
    """
    if not _has_valid_key():
        logger.warning("No valid LLM API key — returning demo recommendation")
        return _demo_recommendation(current_message, deal_context, recalled_memories)

    try:
        from openai import AsyncOpenAI
        base_url = _PROVIDER_URLS.get(settings.llm_provider, settings.llm_provider)
        client = AsyncOpenAI(api_key=settings.llm_api_key, base_url=base_url)

        memory_section = _format_memories(recalled_memories)
        deal_section = _format_deal_context(deal_context)

        user_content = f"""## Current Deal
{deal_section}

## Relevant Memories from Past Interactions
{memory_section}

## Salesperson's Request
{current_message}

Provide a specific, actionable recommendation based on this deal and its history."""

        messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]
        if conversation_history:
            messages.extend(conversation_history[-6:])
        messages.append({"role": "user", "content": user_content})

        response = await client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,  # type: ignore[arg-type]
            max_tokens=800,
            temperature=0.4,
        )
        recommendation = response.choices[0].message.content or ""
        return {"recommendation": recommendation, "error": None}

    except Exception as exc:
        logger.error("LLM generation failed: %s", exc)
        # Fall back to demo response so the UI doesn't break
        demo = _demo_recommendation(current_message, deal_context, recalled_memories)
        demo["error"] = str(exc)
        return demo


def _demo_recommendation(
    message: str,
    deal: dict[str, Any],
    memories: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Generate a realistic-looking recommendation without an LLM.
    Uses the recalled memories to construct a contextual response.
    """
    customer = deal.get("customer_name", "the customer")
    company = deal.get("customer_company", "the company")
    stage = deal.get("stage", "Negotiation")
    value = deal.get("value", 0)

    # Scan memories for key context
    objections = [m for m in memories if m.get("context") == "customer_objection"]
    successes  = [m for m in memories if m.get("context") == "successful_approach"]
    failures   = [m for m in memories if m.get("context") == "failed_approach"]
    budget     = [m for m in memories if m.get("context") == "budget_discussion"]
    competitor = [m for m in memories if m.get("context") == "competitor_mention"]
    decision   = [m for m in memories if m.get("context") == "decision_making"]
    preference = [m for m in memories if m.get("context") == "communication_preference"]

    lines = [f"## Recommendation for {company} Deal — {stage} Stage\n"]

    if memories:
        lines.append(f"*Based on {len(memories)} recalled memories from previous interactions.*\n")

        if successes:
            lines.append("### ✅ What Has Worked")
            for s in successes[:2]:
                lines.append(f"- {s['text'][:200]}")
            lines.append("")

        if objections:
            lines.append("### ⚠️ Active Concerns to Address")
            for o in objections[:2]:
                lines.append(f"- {o['text'][:200]}")
            lines.append("")

        if failures:
            lines.append("### ❌ What to Avoid")
            for f in failures[:1]:
                lines.append(f"- {f['text'][:200]}")
            lines.append("")

        if competitor:
            lines.append("### 🏆 Competitive Positioning")
            for c in competitor[:1]:
                lines.append(f"- {c['text'][:200]}")
            lines.append("")

        if budget:
            lines.append("### 💰 Budget Context")
            for b in budget[:1]:
                lines.append(f"- {b['text'][:200]}")
            lines.append("")

        if decision:
            lines.append("### 👤 Decision Maker Intelligence")
            for d in decision[:1]:
                lines.append(f"- {d['text'][:200]}")
            lines.append("")

        lines.append("### 🎯 Recommended Next Steps")
        lines.append(f"1. Send a follow-up email to {customer} (preferred communication channel if noted above)")
        lines.append(f"2. Prepare a 2-page executive summary highlighting ROI for the ${value:,.0f} investment")
        lines.append("3. Lead with the phased implementation approach to reduce perceived risk")
        lines.append("4. Reference the specific concerns addressed in previous conversations")

    else:
        # No memories — Interaction 1 style generic response
        lines.append(f"### First Interaction with {company}")
        lines.append(f"\nThis is an early-stage interaction with {customer}. No prior history has been recorded yet.")
        lines.append("\n### Recommended Approach")
        lines.append("1. **Discover key concerns** — Ask open-ended questions about their current pain points")
        lines.append("2. **Understand timeline** — When do they need this solution in place?")
        lines.append("3. **Map stakeholders** — Who else is involved in the decision?")
        lines.append("4. **Identify budget range** — Are there fiscal constraints or approval requirements?")
        lines.append("5. **Note everything** — Log all customer responses so DealMind can personalize future recommendations")
        lines.append(f"\n*As you log more interactions, DealMind will recall this context and give you increasingly specific advice for {company}.*")

    lines.append("\n---")
    lines.append("*⚡ Add your Groq API key to `.env` to enable live AI recommendations*")

    return {"recommendation": "\n".join(lines), "error": None}


def _format_memories(memories: list[dict[str, Any]]) -> str:
    if not memories:
        return "No previous memories available. This is the first recorded interaction."
    return "\n".join(
        f"{i}. [{m.get('context', 'general')}] {m['text']}"
        for i, m in enumerate(memories[:8], 1)
    )


def _format_deal_context(ctx: dict[str, Any]) -> str:
    return (
        f"- Customer: {ctx.get('customer_name', 'Unknown')} ({ctx.get('customer_company', '')})\n"
        f"- Deal: {ctx.get('title', '')}\n"
        f"- Value: ${ctx.get('value', 0):,.0f}\n"
        f"- Stage: {ctx.get('stage', 'Unknown')}\n"
        f"- Industry: {ctx.get('customer_industry', '')}\n"
        f"- Role: {ctx.get('customer_role', '')}\n"
        f"- Expected Close: {ctx.get('expected_close_days', 30)} days\n"
        f"- Salesperson: {ctx.get('salesperson_name', '')}"
    )
