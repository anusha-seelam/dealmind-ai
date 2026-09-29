"""Pydantic request/response schemas for all API endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Deals ────────────────────────────────────────────────────────────────────

class DealOut(BaseModel):
    id: str
    bank_id: str
    salesperson_name: str
    customer_name: str
    customer_company: str
    customer_industry: str
    customer_role: str
    customer_email: str | None
    title: str
    value: float
    stage: str
    expected_close_days: int
    product_service: str | None
    created_at: datetime
    interaction_count: int = 0
    memory_count: int = 0

    model_config = {"from_attributes": True}


class DealCreate(BaseModel):
    salesperson_name: str
    customer_name: str
    customer_company: str
    customer_industry: str = "Technology"
    customer_role: str = "Decision Maker"
    customer_email: str | None = None
    title: str
    value: float
    stage: str = "Discovery"
    expected_close_days: int = 30
    product_service: str | None = None


# ── Interactions ─────────────────────────────────────────────────────────────

class InteractionOut(BaseModel):
    id: str
    deal_id: str
    role: str
    content: str
    recommendation: str | None
    recalled_memories: list[dict[str, Any]] | None
    memory_count: int
    hindsight_doc_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Agent Chat ───────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_history: list[dict[str, str]] | None = None


class MemoryItem(BaseModel):
    id: str | None = None
    text: str
    type: str
    context: str
    score: dict[str, Any] | None = None
    mentioned_at: str | None = None


class ChatResponse(BaseModel):
    recommendation: str
    recalled_memories: list[MemoryItem]
    memory_count: int
    hindsight_available: bool
    hindsight_doc_id: str
    memory_stored: bool
    error: str | None = None


# ── Memories ─────────────────────────────────────────────────────────────────

class MemoriesResponse(BaseModel):
    memories: list[MemoryItem]
    count: int
    error: str | None = None
    available: bool


class StoreMemoryRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    context: str = "customer_update"


# ── Demo ─────────────────────────────────────────────────────────────────────

class DemoRequest(BaseModel):
    interaction_number: int = Field(..., ge=1, le=20)


class DemoResponse(BaseModel):
    demo_label: str
    demo_message: str
    recommendation: str
    recalled_memories: list[MemoryItem]
    memory_count: int
    hindsight_available: bool
    memory_stored: bool
    error: str | None = None


# ── Stats ────────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_deals: int
    total_interactions: int
    total_memories: int
    hindsight_available: bool
    featured_deal: DealOut | None = None
