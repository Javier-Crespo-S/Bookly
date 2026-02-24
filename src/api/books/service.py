from src.api.extensions import db
from src.api.books.models import Book
from src.api.users.models import User
from src.api.utils import APIException


def get_books(user_id: int | None = None):
    q = Book.query
    if user_id is not None:
        q = q.filter_by(user_id=user_id)
    return q.all()


def get_book(book_id: int):
    return Book.query.get(book_id)


def get_book_by_user_google(user_id: int, google_id: str) -> Book | None:
    return Book.query.filter_by(user_id=user_id, google_id=google_id).first()


def get_book_by_google_id(user_id: int, google_id: str) -> Book | None:
    return get_book_by_user_google(user_id, google_id)


def create_book(data: dict, user_id: int) -> Book:
    google_id = data.get("google_id")
    if not google_id:
        raise APIException("google_id is required", status_code=400, error_type="validation_error")

    user = User.query.get(user_id)
    if not user:
        raise APIException("User not found", status_code=404, error_type="not_found", payload={"user_id": user_id})

    existing = get_book_by_user_google(user_id, google_id)
    if existing:
        raise APIException(
            "Book already exists in your library",
            status_code=409,
            error_type="conflict",
            payload={"google_id": google_id, "user_id": user_id},
        )

    title = data.get("title")
    author = data.get("author")

    if not title or not isinstance(title, str) or not title.strip():
        raise APIException("title is required", status_code=400, error_type="validation_error")
    if not author or not isinstance(author, str) or not author.strip():
        raise APIException("author is required", status_code=400, error_type="validation_error")

    book = Book(
        google_id=google_id,
        title=title.strip(),
        author=author.strip(),
        published_date=data.get("published_date"),
        user_id=user_id,
    )

    db.session.add(book)
    db.session.commit()
    return book


def delete_book(book_id: int) -> bool:
    book = Book.query.get(book_id)
    if not book:
        return False
    db.session.delete(book)
    db.session.commit()
    return True