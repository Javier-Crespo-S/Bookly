"""
from src.api.extensions import db
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)

    # Relación con Book
    books: Mapped[list] = relationship(
        "Book",
        backref="user",
        lazy=True,
        foreign_keys="Book.user_id"
    )

    # Relación con Review
    reviews: Mapped[list] = relationship(
        "Review",
        backref="user",
        lazy=True,
        foreign_keys="Review.user_id"
    )

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            # no incluir la contraseña
        }
    
    """