from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Boolean
from src.api.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False,
        default=True,
        server_default="1",
    )

    books: Mapped[list["Book"]] = relationship(
        "Book",
        back_populates="user",
        lazy="select",
        cascade="all, delete-orphan",
    )

    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="user",
        lazy="select",
        cascade="all, delete-orphan",
    )

    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
        }