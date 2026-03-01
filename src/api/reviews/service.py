from src.api.extensions import db
from src.api.reviews.models import Review

def create_review(book_id: int, user_id: int, content: str, rating: int | None = None):
    review = Review(book_id=book_id, user_id=user_id, content=content, rating=rating)
    db.session.add(review)
    db.session.commit()
    return review

def get_reviews_by_book(book_id: int):
    return Review.query.filter_by(book_id=book_id).all()

def get_review(review_id: int):
    return Review.query.get(review_id)

def delete_review(review_id: int) -> bool:
    review = Review.query.get(review_id)
    if not review:
        return False
    db.session.delete(review)
    db.session.commit()
    return True