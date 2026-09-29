"""
DealMind API routes — all deal/agent routes require a valid JWT token.

Public:
  GET  /api/health
  POST /api/auth/register   (in auth_routes.py)
  POST /api/auth/login      (in auth_routes.py)

Protected (Bearer token required):
  GET  /api/stats
  GET  /api/deals
  GET  /api/deals/{deal_id}
  GET  /api/deals/{deal_id}/interactions
  POST /api/deals
  POST /api/deals/{deal_id}/chat
  GET  /api/deals/{deal_id}/memories
  POST /api/deals/{deal_id}/memory
  POST /api/deals/{deal_id}/demo
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agents import sales_agent
from app.api.schemas import (
    ChatRequest, ChatResponse,
    DashboardStats, DealCreate, DealOut,
    DemoRequest, DemoResponse,
    InteractionOut, MemoriesResponse, MemoryItem, StoreMemoryRequest,
)
from app.core.auth import get_current_user
from app.database.db import get_db
from app.models.deal import Deal, Interaction
from app.models.user import User
from app.services import hindsight_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ── Health (public) ───────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    hindsight_ok = await hindsight_service.check_hindsight_health()
    return {"status": "ok", "hindsight": "connected" if hindsight_ok else "unavailable"}


# ── Stats (protected) ─────────────────────────────────────────────────────────

@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal_count_q = await db.execute(select(func.count(Deal.id)))
    total_deals = deal_count_q.scalar() or 0

    int_count_q = await db.execute(select(func.count(Interaction.id)))
    total_interactions = int_count_q.scalar() or 0

    featured_q = await db.execute(
        select(Deal)
        .options(selectinload(Deal.interactions))
        .where(Deal.bank_id == "deal-novatech-001")
        .limit(1)
    )
    featured = featured_q.scalar_one_or_none()
    featured_out = None
    total_memories = 0

    if featured:
        stats = await hindsight_service.get_bank_stats(featured.bank_id)
        total_memories = stats["total_memories"]
        featured_out = DealOut(
            **{c.name: getattr(featured, c.name) for c in Deal.__table__.columns},
            interaction_count=len(featured.interactions),
            memory_count=total_memories,
        )

    hindsight_ok = await hindsight_service.check_hindsight_health()
    return DashboardStats(
        total_deals=total_deals,
        total_interactions=total_interactions,
        total_memories=total_memories,
        hindsight_available=hindsight_ok,
        featured_deal=featured_out,
    )


# ── Deals (protected) ─────────────────────────────────────────────────────────

@router.get("/deals", response_model=list[DealOut])
async def list_deals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = await db.execute(
        select(Deal).options(selectinload(Deal.interactions)).order_by(Deal.created_at.desc())
    )
    deals = q.scalars().all()
    result = []
    for d in deals:
        stats = await hindsight_service.get_bank_stats(d.bank_id)
        result.append(DealOut(
            **{c.name: getattr(d, c.name) for c in Deal.__table__.columns},
            interaction_count=len(d.interactions),
            memory_count=stats["total_memories"],
        ))
    return result


@router.get("/deals/{deal_id}", response_model=DealOut)
async def get_deal(
    deal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal = await _get_deal_or_404(deal_id, db)
    stats = await hindsight_service.get_bank_stats(deal.bank_id)
    return DealOut(
        **{c.name: getattr(deal, c.name) for c in Deal.__table__.columns},
        interaction_count=len(deal.interactions),
        memory_count=stats["total_memories"],
    )


@router.get("/deals/{deal_id}/interactions", response_model=list[InteractionOut])
async def get_interactions(
    deal_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_deal_or_404(deal_id, db)
    q = await db.execute(
        select(Interaction)
        .where(Interaction.deal_id == deal_id)
        .order_by(Interaction.created_at.asc())
    )
    result = []
    for intr in q.scalars().all():
        recalled = None
        if intr.recalled_memories:
            try:
                recalled = json.loads(intr.recalled_memories)
            except Exception:
                recalled = []
        result.append(InteractionOut(
            id=intr.id, deal_id=intr.deal_id,
            role=intr.role, content=intr.content,
            recommendation=intr.recommendation,
            recalled_memories=recalled,
            memory_count=intr.memory_count,
            hindsight_doc_id=intr.hindsight_doc_id,
            created_at=intr.created_at,
        ))
    return result


@router.post("/deals", response_model=DealOut, status_code=status.HTTP_201_CREATED)
async def create_deal(
    payload: DealCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import uuid, re
    bank_id = (
        "deal-"
        + re.sub(r"[^a-z0-9]+", "-", payload.customer_company.lower())[:30]
        + "-" + uuid.uuid4().hex[:6]
    )
    deal = Deal(
        bank_id=bank_id,
        salesperson_name=payload.salesperson_name,
        customer_name=payload.customer_name,
        customer_company=payload.customer_company,
        customer_industry=payload.customer_industry,
        customer_role=payload.customer_role,
        customer_email=payload.customer_email,
        title=payload.title,
        value=payload.value,
        stage=payload.stage,
        expected_close_days=payload.expected_close_days,
        product_service=payload.product_service,
    )
    db.add(deal)
    await db.commit()
    await db.refresh(deal)
    await hindsight_service.create_deal_bank(
        bank_id=bank_id, deal_title=payload.title, customer=payload.customer_name,
    )
    return DealOut(
        **{c.name: getattr(deal, c.name) for c in Deal.__table__.columns},
        interaction_count=0, memory_count=0,
    )


# ── AI Agent Chat (protected) ─────────────────────────────────────────────────

@router.post("/deals/{deal_id}/chat", response_model=ChatResponse)
async def chat_with_agent(
    deal_id: str,
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    deal = await _get_deal_or_404(deal_id, db)
    deal_dict = {c.name: getattr(deal, c.name) for c in Deal.__table__.columns}

    result = await sales_agent.process_interaction(
        deal=deal_dict,
        message=payload.message,
        conversation_history=payload.conversation_history,
    )
    intr = Interaction(
        deal_id=deal_id, role="agent",
        content=payload.message,
        recommendation=result["recommendation"],
        recalled_memories=json.dumps(result["recalled_memories"]),
        memory_count=result["memory_count"],
        hindsight_doc_id=result["hindsight_doc_id"],
    )
    db.add(intr)
    await db.commit()

    return ChatResponse(
        recommendation=result["recommendation"],
        recalled_memories=[MemoryItem(**m) for m in result["recalled_memories"]],
        memory_count=result["memory_count"],
        hindsight_available=result["hindsight_available"],
        hindsight_doc_id=result["hindsight_doc_id"],
        memory_stored=result["memory_stored"],
        error=result.get("error"),
    )


# ── Memory endpoints (protected) ──────────────────────────────────────────────

@router.get("/deals/{deal_id}/memories", response_model=MemoriesResponse)
async def get_deal_memories(
    deal_id: str,
    query: str = "sales interaction customer deal",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal = await _get_deal_or_404(deal_id, db)
    result = await hindsight_service.recall_deal_context(
        bank_id=deal.bank_id, query=query, budget="high", max_tokens=5000,
    )
    return MemoriesResponse(
        memories=[MemoryItem(**m) for m in result["memories"]],
        count=result["count"], error=result["error"], available=result["available"],
    )


@router.post("/deals/{deal_id}/memory", status_code=status.HTTP_201_CREATED)
async def store_memory(
    deal_id: str,
    payload: StoreMemoryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal = await _get_deal_or_404(deal_id, db)
    result = await sales_agent.store_customer_update(
        bank_id=deal.bank_id,
        customer_name=deal.customer_name,
        update_text=payload.content,
        context=payload.context,
    )
    if not result["success"]:
        raise HTTPException(status_code=503, detail=f"Memory store failed: {result['error']}")
    intr = Interaction(
        deal_id=deal_id, role="salesperson",
        content=payload.content, memory_count=0,
        hindsight_doc_id=result.get("doc_id"),
    )
    db.add(intr)
    await db.commit()
    return {"success": True, "doc_id": result.get("doc_id")}


# ── Demo (protected) ──────────────────────────────────────────────────────────

@router.post("/deals/{deal_id}/demo", response_model=DemoResponse)
async def run_demo(
    deal_id: str,
    payload: DemoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal = await _get_deal_or_404(deal_id, db)
    deal_dict = {c.name: getattr(deal, c.name) for c in Deal.__table__.columns}
    result = await sales_agent.run_demo_interaction(
        deal=deal_dict, interaction_number=payload.interaction_number,
    )
    intr = Interaction(
        deal_id=deal_id, role="agent",
        content=result["demo_message"],
        recommendation=result["recommendation"],
        recalled_memories=json.dumps(result["recalled_memories"]),
        memory_count=result["memory_count"],
        hindsight_doc_id=result["hindsight_doc_id"],
    )
    db.add(intr)
    await db.commit()
    return DemoResponse(
        demo_label=result["demo_label"],
        demo_message=result["demo_message"],
        recommendation=result["recommendation"],
        recalled_memories=[MemoryItem(**m) for m in result["recalled_memories"]],
        memory_count=result["memory_count"],
        hindsight_available=result["hindsight_available"],
        memory_stored=result["memory_stored"],
        error=result.get("error"),
    )


# ── Helper ────────────────────────────────────────────────────────────────────

async def _get_deal_or_404(deal_id: str, db: AsyncSession) -> Deal:
    q = await db.execute(
        select(Deal).options(selectinload(Deal.interactions)).where(Deal.id == deal_id)
    )
    deal = q.scalar_one_or_none()
    if not deal:
        raise HTTPException(status_code=404, detail=f"Deal {deal_id} not found")
    return deal
