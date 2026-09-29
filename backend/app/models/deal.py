"""SQLAlchemy ORM models for Deals and Interactions."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _uuid() -> str:
    return str(uuid.uuid4())


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    # Hindsight bank id for this deal's memories
    bank_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    # Salesperson
    salesperson_name: Mapped[str] = mapped_column(String(120), nullable=False)

    # Customer
    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_company: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_industry: Mapped[str] = mapped_column(String(80), nullable=False, default="Technology")
    customer_role: Mapped[str] = mapped_column(String(80), nullable=False, default="Decision Maker")
    customer_email: Mapped[str] = mapped_column(String(160), nullable=True)

    # Deal metadata
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    stage: Mapped[str] = mapped_column(String(60), nullable=False, default="Discovery")
    # e.g. 30 (days to expected close)
    expected_close_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    product_service: Mapped[str] = mapped_column(String(200), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    interactions: Mapped[list["Interaction"]] = relationship(
        "Interaction", back_populates="deal", cascade="all, delete-orphan", order_by="Interaction.created_at"
    )


class Interaction(Base):
    __tablename__ = "interactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    deal_id: Mapped[str] = mapped_column(String(36), ForeignKey("deals.id"), nullable=False)

    # Who spoke and what was said
    role: Mapped[str] = mapped_column(String(20), nullable=False)   # "customer" | "salesperson" | "agent"
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # The AI recommendation generated for this turn (if role==agent)
    recommendation: Mapped[str] = mapped_column(Text, nullable=True)

    # Memories recalled from Hindsight for this turn (JSON string of list)
    recalled_memories: Mapped[str] = mapped_column(Text, nullable=True)
    memory_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Hindsight document_id used when storing this interaction
    hindsight_doc_id: Mapped[str] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    deal: Mapped["Deal"] = relationship("Deal", back_populates="interactions")
