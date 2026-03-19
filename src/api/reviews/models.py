from __future__ import annotations

from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, UniqueConstraint, DateTime
from src.api.extensions import db


class Review(db.Model):
    __tablename__ = "reviews"

    __table_args__ = (
        UniqueConstraint("book_id", "user_id", name="uq_review_user_book"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    book_id: Mapped[int] = mapped_column(Integer, db.ForeignKey("books.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, db.ForeignKey("users.id"), nullable=False)

    content: Mapped[str] = mapped_column(String(500), nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=db.func.current_timestamp(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=db.func.current_timestamp(),
    )

    book: Mapped["Book"] = relationship(
        "Book",
        back_populates="reviews",
        lazy="select",
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="reviews",
        lazy="select",
    )

    def serialize(self):
        return {
            "id": self.id,
            "book_id": self.book_id,
            "user_id": self.user_id,
            "content": self.content,
            "rating": self.rating,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "user": {
                "id": self.user.id,
                "username": getattr(self.user, "username", None),
                "email": getattr(self.user, "email", None),
            } if self.user else None,
        }