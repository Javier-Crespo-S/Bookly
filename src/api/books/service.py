from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import aliased

from src.api.extensions import db
from src.api.utils import APIException
from .models import Book
from src.api.reviews.models import Review

ALLOWED_BOOK_STATUSES = {"wishlist", "reading", "read", "abandoned"}


def _normalize_text(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def _normalize_thumbnail(data: dict) -> str | None:
    image_links = data.get("imageLinks") or {}

    thumbnail = (
        _normalize_text(data.get("thumbnail"))
        or _normalize_text(data.get("image"))
        or _normalize_text(data.get("cover_url"))
        or _normalize_text(image_links.get("thumbnail"))
        or _normalize_text(image_links.get("smallThumbnail"))
    )

    if thumbnail and thumbnail.startswith("http://"):
        thumbnail = thumbnail.replace("http://", "https://", 1)

    return thumbnail


def get_books(user_id: int):
    user_book = aliased(Book)
    shared_book = aliased(Book)

    rows = (
        db.session.query(
            user_book,
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("reviews_count"),
        )
        .outerjoin(shared_book, shared_book.google_id == user_book.google_id)
        .outerjoin(Review, Review.book_id == shared_book.id)
        .filter(user_book.user_id == user_id)
        .group_by(user_book.id)
        .order_by(user_book.id.desc())
        .all()
    )

    result = []
    for book, avg_rating, reviews_count in rows:
        payload = book.serialize()
        payload["avg_rating"] = round(float(avg_rating), 1) if avg_rating is not None else None
        payload["reviews_count"] = int(reviews_count or 0)
        result.append(payload)

    return result


def get_review_stats_by_google_ids(google_ids: list[str]) -> dict[str, dict]:
    clean_ids = [gid for gid in google_ids if gid]
    if not clean_ids:
        return {}

    rows = (
        db.session.query(
            Book.google_id,
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("reviews_count"),
        )
        .outerjoin(Review, Review.book_id == Book.id)
        .filter(Book.google_id.in_(clean_ids))
        .group_by(Book.google_id)
        .all()
    )

    stats = {}
    for google_id, avg_rating, reviews_count in rows:
        stats[google_id] = {
            "avg_rating": round(float(avg_rating), 1) if avg_rating is not None else None,
            "reviews_count": int(reviews_count or 0),
        }

    return stats


def create_book(data: dict, user_id: int):
    google_id = _normalize_text(data.get("google_id")) or ""
    title = _normalize_text(data.get("title")) or "Untitled"

    author = _normalize_text(data.get("author"))
    if not author and isinstance(data.get("authors"), list):
        cleaned_authors = [str(a).strip() for a in data.get("authors", []) if str(a).strip()]
        author = ", ".join(cleaned_authors) if cleaned_authors else None

    if not author:
        author = "Autor desconocido"

    published_date = (
        _normalize_text(data.get("published_date"))
        or _normalize_text(data.get("publishedDate"))
        or _normalize_text(data.get("published"))
    )

    thumbnail = _normalize_thumbnail(data)
    description = _normalize_text(data.get("description"))
    status = _normalize_text(data.get("status")) or "wishlist"

    if not google_id:
        raise APIException("google_id is required", status_code=400, error_type="validation_error")

    if status not in ALLOWED_BOOK_STATUSES:
        raise APIException("Invalid status", status_code=400, error_type="validation_error")

    existing = Book.query.filter_by(user_id=user_id, google_id=google_id).first()
    if existing:
        raise APIException(
            "Book already exists in your library",
            status_code=409,
            error_type="conflict",
            payload={"google_id": google_id},
        )

    book = Book(
        google_id=google_id,
        title=title,
        author=author,
        published_date=published_date,
        thumbnail=thumbnail,
        description=description,
        status=status,
        user_id=user_id,
    )

    db.session.add(book)
    db.session.commit()
    db.session.refresh(book)
    return book


def update_book_status(book_id: int, user_id: int, status: str):
    status = (status or "").strip()

    if status not in ALLOWED_BOOK_STATUSES:
        raise APIException("Invalid status", status_code=400, error_type="validation_error")

    book = Book.query.filter_by(id=book_id, user_id=user_id).first()
    if not book:
        raise APIException("Book not found", status_code=404, error_type="not_found")

    book.status = status
    db.session.commit()
    db.session.refresh(book)
    return book


def _parse_published_date(raw: str | None):
    if not raw:
        return None

    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def get_discover_lists(limit: int = 3):
    rows = (
        db.session.query(
            func.min(Book.id).label("id"),
            Book.google_id,
            func.min(Book.title).label("title"),
            func.min(Book.author).label("author"),
            func.min(Book.published_date).label("published_date"),
            func.min(Book.thumbnail).label("thumbnail"),
            func.min(Book.description).label("description"),
            func.avg(Review.rating).label("avg_rating"),
            func.count(Review.id).label("reviews_count"),
        )
        .outerjoin(Review, Review.book_id == Book.id)
        .group_by(Book.google_id)
        .all()
    )

    items = []
    for book_id, google_id, title, author, published_date, thumbnail, description, avg_rating, reviews_count in rows:
        if avg_rating is None or int(reviews_count or 0) == 0:
            continue

        items.append({
            "id": int(book_id),
            "google_id": google_id,
            "title": title,
            "author": author,
            "published_date": published_date,
            "thumbnail": thumbnail,
            "description": description,
            "avg_rating": round(float(avg_rating), 1),
            "reviews_count": int(reviews_count or 0),
            "_published_dt": _parse_published_date(published_date),
            "source": "local",
        })

    popular = sorted(
        items,
        key=lambda x: (x["avg_rating"], x["reviews_count"]),
        reverse=True,
    )[:limit]

    cutoff = date.today() - timedelta(days=365)
    new_releases = [
        x for x in items
        if x["_published_dt"] is not None and x["_published_dt"] >= cutoff
    ]
    new_releases = sorted(
        new_releases,
        key=lambda x: (x["avg_rating"], x["reviews_count"]),
        reverse=True,
    )[:limit]

    for arr in (popular, new_releases):
        for item in arr:
            item.pop("_published_dt", None)

    return {
        "popular": popular,
        "new_releases": new_releases,
    }