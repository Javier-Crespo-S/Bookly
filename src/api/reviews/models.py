from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String
from src.api.extensions import db


class Review(db.Model):
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    book_id: Mapped[int] = mapped_column(Integer, db.ForeignKey("books.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, db.ForeignKey("users.id"), nullable=False)

    content: Mapped[str] = mapped_column(String(500), nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)

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
        }