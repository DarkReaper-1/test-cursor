from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class HistoryRow(Base):
    __tablename__ = "history"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, default="guest")
    title: Mapped[str] = mapped_column(String(255))
    subtitle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32))
    kind: Mapped[str] = mapped_column(String(64))
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FavoriteRow(Base):
    __tablename__ = "favorites"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True, default="guest")
    title: Mapped[str] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(64))
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    payload_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ProfileRow(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120), default="Guest")
    school: Mapped[str] = mapped_column(String(64), default="general_sunni")
    text_scale: Mapped[str] = mapped_column(String(16), default="1.0")
    dark_mode: Mapped[str] = mapped_column(String(8), default="false")
    color_blind_friendly: Mapped[str] = mapped_column(String(8), default="true")
    voice_reading: Mapped[str] = mapped_column(String(8), default="true")
    language: Mapped[str] = mapped_column(String(16), default="en")
