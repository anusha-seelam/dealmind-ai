"""User ORM model."""
from datetime import datetime, timezone
from sqlalchemy import DateTime, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.database.db import Base
import uuid


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(200), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
