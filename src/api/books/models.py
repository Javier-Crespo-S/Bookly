from __future__ import annotations

from sqlalchemy import String, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.api.extensions import db


class Book(db.Model):
    __tablename__ = "books"
    __table_args__ = (
        UniqueConstraint("user_id", "google_id", name="uq_books_user_google"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    published_date: Mapped[str | None] = mapped_column(String(255), nullable=True)

    google_id: Mapped[str] = mapped_column(String(255), nullable=False)

    user_id: Mapped[int] = mapped_column(Integer, db.ForeignKey("users.id"), nullable=False)

    user: Mapped["User"] = relationship(
        "User",
        back_populates="books",
        lazy="select",
    )

    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="book",
        lazy="select",
        cascade="all, delete-orphan",
    )

    def serialize(self):
        return {
            "id": self.id,
            "title": self.title,
            "author": self.author,
            "published_date": self.published_date,
            "google_id": self.google_id,
            "user_id": self.user_id,
        }