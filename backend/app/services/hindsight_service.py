"""
HindsightService — all Hindsight memory operations for DealMind.

The hindsight_client SDK is synchronous. FastAPI is async.
All blocking client calls are wrapped in asyncio.to_thread() so they
run in a thread pool without blocking the event loop.

When Hindsight is not reachable, the service falls back to realistic
in-process mock memories so the demo works fully offline.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# In-process mock store — persists for the life of the server process
_mock_store: dict[str, list[dict]] = {}
_mock_retain_count: dict[str, int] = {}


# ── Hindsight client ─────────────────────────────────────────────────────────

def _make_client():
    """Create a Hindsight client. Returns None if the package isn't installed."""
    try:
        from hindsight_client import Hindsight
        kwargs: dict[str, Any] = {"base_url": settings.hindsight_base_url}
        if settings.hindsight_api_key:
            kwargs["api_key"] = settings.hindsight_api_key
        return Hindsight(**kwargs)
    except Exception:
        return None


async def _run(fn, *args, **kwargs):
    """
    Run a synchronous callable in a thread pool.
    Returns (result, error_string).
    """
    try:
        result = await asyncio.to_thread(fn, *args, **kwargs)
        return result, None
    except Exception as exc:
        return None, str(exc)


# ── Mock memory data for demo / offline mode ─────────────────────────────────

_DEMO_MEMORIES: dict[str, list[dict]] = {
    "none": [],
    "few": [
        {
            "id": "mem-001",
            "text": "Sarah Chen stated: 'Implementation time is a major concern — our team cannot afford a 6-month disruption to current operations.'",
            "type": "world", "context": "customer_objection",
            "mentioned_at": "2026-09-01T10:00:00",
        },
        {
            "id": "mem-002",
            "text": "NovaTech's approved budget is fixed at $85,000 maximum. Sarah confirmed she cannot exceed this without CTO re-approval.",
            "type": "world", "context": "budget_discussion",
            "mentioned_at": "2026-09-05T14:00:00",
        },
        {
            "id": "mem-003",
            "text": "NovaTech is evaluating TechRival Pro and DataStream Enterprise. TechRival is cheaper but has no enterprise support.",
            "type": "world", "context": "competitor_mention",
            "mentioned_at": "2026-09-08T11:00:00",
        },
        {
            "id": "mem-004",
            "text": "Proposed phased implementation to Sarah: Phase 1 in 6 weeks, Phase 2 in 3 months. She responded positively: 'This makes it much more manageable.'",
            "type": "experience", "context": "successful_approach",
            "mentioned_at": "2026-09-10T09:00:00",
        },
        {
            "id": "mem-005",
            "text": "CTO Marcus Chen has final sign-off. He wants a 2-page executive summary with ROI projections, not a product demo.",
            "type": "world", "context": "decision_making",
            "mentioned_at": "2026-09-12T15:00:00",
        },
    ],
    "many": [
        {
            "id": "mem-001",
            "text": "Customer objection RESOLVED: Sarah's implementation concern was addressed with phased rollout. Do not reopen this topic.",
            "type": "world", "context": "customer_objection",
            "mentioned_at": "2026-09-01T10:00:00",
        },
        {
            "id": "mem-004",
            "text": "SUCCESSFUL APPROACH: Phased implementation received strongly positive feedback. Always frame the deal as a phased low-risk rollout.",
            "type": "experience", "context": "successful_approach",
            "mentioned_at": "2026-09-10T09:00:00",
        },
        {
            "id": "mem-006",
            "text": "Sarah prefers email over calendar invites. Responds to emails within 2 hours. Always email first, then follow up with a calendar invite.",
            "type": "world", "context": "communication_preference",
            "mentioned_at": "2026-09-14T10:00:00",
        },
        {
            "id": "mem-003",
            "text": "TechRival Pro has no dedicated onboarding support. Our 90-day customer success program is the key differentiator — Sarah confirmed this resonated.",
            "type": "world", "context": "competitor_mention",
            "mentioned_at": "2026-09-08T11:00:00",
        },
        {
            "id": "mem-002",
            "text": "Budget: $85K approved. Our proposal is $80K — $5K room. Do NOT offer a discount proactively; Sarah hasn't pushed back on price.",
            "type": "world", "context": "budget_discussion",
            "mentioned_at": "2026-09-05T14:00:00",
        },
        {
            "id": "mem-005",
            "text": "CTO wants a 2-page ROI executive summary. Sarah confirmed this last week and will forward it directly to him.",
            "type": "world", "context": "decision_making",
            "mentioned_at": "2026-09-12T15:00:00",
        },
        {
            "id": "mem-007",
            "text": "Sent ROI calculator to Sarah — she replied: 'This is exactly what we needed' and forwarded it to the CTO the same day.",
            "type": "experience", "context": "successful_approach",
            "mentioned_at": "2026-09-18T16:00:00",
        },
        {
            "id": "mem-008",
            "text": "FAILED APPROACH: Offered early-close discount to create urgency. Sarah felt pressured and went quiet for a week. Never use urgency tactics with this customer.",
            "type": "experience", "context": "failed_approach",
            "mentioned_at": "2026-09-20T09:00:00",
        },
    ],
}


def _mock_memories_for(bank_id: str) -> list[dict]:
    """Return appropriately staged mock memories based on how much has been stored."""
    stored = _mock_store.get(bank_id, [])
    count = _mock_retain_count.get(bank_id, 0)
    if stored:
        return stored[-8:]
    if count >= 8:
        return _DEMO_MEMORIES["many"]
    if count >= 3:
        return _DEMO_MEMORIES["few"]
    return _DEMO_MEMORIES["none"]


# ── Public API ────────────────────────────────────────────────────────────────

async def create_deal_bank(bank_id: str, deal_title: str, customer: str) -> bool:
    client = _make_client()
    if client is None:
        _mock_store.setdefault(bank_id, [])
        return True

    def _create():
        client.create_bank(
            bank_id=bank_id,
            name=f"DealMind: {deal_title}",
            mission=(
                f"You are a sales intelligence system tracking the deal with {customer}. "
                "Remember customer objections, concerns, budget constraints, competitor mentions, "
                "successful strategies, and important decisions. "
                "Focus on information that will help close this deal."
            ),
        )

    _, err = await _run(_create)
    if err:
        logger.warning("create_bank failed (%s) — using mock store", err)
        _mock_store.setdefault(bank_id, [])
    else:
        logger.info("Hindsight bank created: %s", bank_id)
    return True  # non-fatal either way


async def retain_interaction(
    bank_id: str,
    content: str,
    context: str = "sales_interaction",
    document_id: str | None = None,
    timestamp: datetime | None = None,
) -> dict[str, Any]:
    client = _make_client()

    if client is not None:
        def _retain():
            kwargs: dict[str, Any] = {
                "bank_id": bank_id,
                "content": content,
                "context": context,
            }
            if document_id:
                kwargs["document_id"] = document_id
            if timestamp:
                kwargs["timestamp"] = timestamp
            client.retain(**kwargs)

        _, err = await _run(_retain)
        if err is None:
            logger.info("Hindsight retain OK — bank=%s", bank_id)
            return {"success": True, "doc_id": document_id, "error": None}
        logger.warning("Hindsight retain failed (%s) — using mock store", err)

    # Mock fallback
    entry = {
        "id": document_id or f"mock-{_mock_retain_count.get(bank_id, 0)+1:03d}",
        "text": content[:400],
        "type": "experience",
        "context": context,
        "mentioned_at": (timestamp or datetime.now(timezone.utc)).isoformat(),
    }
    _mock_store.setdefault(bank_id, []).append(entry)
    _mock_retain_count[bank_id] = _mock_retain_count.get(bank_id, 0) + 1
    return {"success": True, "doc_id": document_id, "error": None}


async def recall_deal_context(
    bank_id: str,
    query: str,
    budget: str = "mid",
    max_tokens: int = 3000,
) -> dict[str, Any]:
    client = _make_client()

    if client is not None:
        def _recall():
            return client.recall(
                bank_id=bank_id,
                query=query,
                budget=budget,
                max_tokens=max_tokens,
            )

        result, err = await _run(_recall)
        if err is None and result is not None:
            memories = [
                {
                    "id": r.id,
                    "text": r.text,
                    "type": r.type,
                    "context": r.context or "",
                    "score": {},
                    "mentioned_at": str(r.mentioned_at) if r.mentioned_at else None,
                }
                for r in result.results
            ]
            return {"memories": memories, "count": len(memories), "error": None, "available": True}
        logger.warning("Hindsight recall failed (%s) — using mock memories", err)

    # Mock fallback
    memories = _mock_memories_for(bank_id)
    return {"memories": memories, "count": len(memories), "error": None, "available": False}


async def store_outcome(
    bank_id: str,
    interaction_summary: str,
    outcome: str,
    document_id: str | None = None,
) -> dict[str, Any]:
    content = f"Sales interaction summary: {interaction_summary}\nOutcome: {outcome}"
    return await retain_interaction(
        bank_id=bank_id,
        content=content,
        context="interaction_outcome",
        document_id=document_id,
    )


async def get_bank_stats(bank_id: str) -> dict[str, Any]:
    client = _make_client()

    if client is not None:
        def _stats():
            resp = client.list_memories(bank_id=bank_id, limit=1000)
            total = getattr(resp, "total", None)
            if total is None:
                total = len(getattr(resp, "items", []))
            return total

        total, err = await _run(_stats)
        if err is None:
            return {"total_memories": total, "available": True, "error": None}

    # Mock fallback
    mock_count = len(_mock_store.get(bank_id, []))
    retain_count = _mock_retain_count.get(bank_id, 0)
    total = max(mock_count, retain_count)
    # Pre-seed a plausible count for the NovaTech demo deal
    if total == 0 and "novatech" in bank_id.lower():
        total = 8
    return {"total_memories": total, "available": False, "error": None}


async def check_hindsight_health() -> bool:
    try:
        import httpx
        async with httpx.AsyncClient() as aclient:
            r = await aclient.get(f"{settings.hindsight_base_url}/health", timeout=2.0)
            return r.status_code == 200
    except Exception:
        return False
