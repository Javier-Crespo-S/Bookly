from __future__ import annotations

from src.api.extensions import db
from src.api.utils import APIException
from src.api.books.models import Book
from src.api.reviews.models import Review


def get_reviews_by_book(book_id: int):
    book = db.session.get(Book, book_id)
    if not book:
        raise APIException("Book not found", status_code=404, error_type="not_found")

    return (
        Review.query
        .filter_by(book_id=book_id)
        .order_by(Review.created_at.desc())
        .all()
    )


def get_reviews_by_google_id(google_id: str):
    books = (
        Book.query
        .filter_by(google_id=google_id)
        .all()
    )

    if not books:
        return []

    book_ids = [book.id for book in books]

    return (
        Review.query
        .filter(Review.book_id.in_(book_ids))
        .order_by(Review.created_at.desc())
        .all()
    )


def get_review(review_id: int):
    return db.session.get(Review, review_id)


def create_review(book_id: int, user_id: int, content: str, rating: int | None):
    book = db.session.get(Book, book_id)
    if not book:
        raise APIException("Book not found", status_code=404, error_type="not_found")

    existing_review = Review.query.filter_by(book_id=book_id, user_id=user_id).first()
    if existing_review:
        raise APIException(
            "You already reviewed this book",
            status_code=409,
            error_type="conflict",
            payload={"book_id": book_id, "user_id": user_id},
        )

    review = Review(
        book_id=book_id,
        user_id=user_id,
        content=content,
        rating=rating,
    )

    db.session.add(review)
    db.session.commit()
    return review


def update_review(review_id: int, content: str, rating: int | None):
    review = db.session.get(Review, review_id)
    if not review:
        raise APIException("Review not found", status_code=404, error_type="not_found")

    review.content = content
    review.rating = rating

    db.session.commit()
    return review


def delete_review(review_id: int):
    review = db.session.get(Review, review_id)
    if not review:
        raise APIException("Review not found", status_code=404, error_type="not_found")

    db.session.delete(review)
    db.session.commit()