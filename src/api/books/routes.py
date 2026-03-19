from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from .service import (
    get_books,
    create_book,
    get_discover_lists,
    update_book_status,
    get_review_stats_by_google_ids,
)
from src.api.services.google_books import search_books, get_volume
from src.api.utils import APIException, require_json, require_str
from src.api.extensions import db
from src.api.books.models import Book
from src.api.reviews.models import Review

books_bp = Blueprint("books", __name__, url_prefix="/api/books")
books_bp.strict_slashes = False


def _normalize_author_list(authors):
    if not isinstance(authors, list):
        return []
    return [str(a).strip() for a in authors if str(a).strip()]


@books_bp.post("/import")
@jwt_required()
def import_book_from_google():
    data = require_json(request.get_json(silent=True))

    google_id = require_str(data, "google_id")
    user_id = int(get_jwt_identity())

    g = get_volume(google_id)

    title = (g.get("title") or "").strip()
    if not title:
        raise APIException("Google book has no title", status_code=502, error_type="upstream_error")

    authors = _normalize_author_list(g.get("authors", []))
    author = ", ".join(authors) if authors else "Autor desconocido"

    payload = {
        "google_id": g.get("google_id") or google_id,
        "title": title,
        "author": author,
        "published_date": g.get("published_date"),
        "thumbnail": (
            g.get("thumbnail")
            or g.get("image")
            or g.get("cover_url")
        ),
        "description": g.get("description"),
        "status": "wishlist",
    }

    book = create_book(payload, user_id)
    return jsonify(book.serialize()), 201


@books_bp.get("/search")
def google_books_search():
    q = request.args.get("q", "")

    try:
        max_results = int(request.args.get("max_results", 10))
        start_index = int(request.args.get("start_index", 0))
    except ValueError:
        raise APIException(
            "max_results and start_index must be integers",
            status_code=400,
            error_type="validation_error",
        )

    if max_results < 1 or max_results > 40:
        raise APIException(
            "max_results must be between 1 and 40",
            status_code=400,
            error_type="validation_error",
        )
    if start_index < 0:
        raise APIException(
            "start_index must be >= 0",
            status_code=400,
            error_type="validation_error",
        )

    results = search_books(q, max_results=max_results, start_index=start_index)

    items = results.get("items", []) if isinstance(results, dict) else []
    google_ids = [item.get("google_id") or item.get("id") for item in items]
    stats_by_google_id = get_review_stats_by_google_ids(google_ids)

    enriched_items = []
    for item in items:
        google_id = item.get("google_id") or item.get("id")
        stats = stats_by_google_id.get(google_id, {})

        enriched = {
            **item,
            "avg_rating": stats.get("avg_rating"),
            "reviews_count": stats.get("reviews_count", 0),
        }
        enriched_items.append(enriched)

    if isinstance(results, dict):
        results["items"] = enriched_items
        return jsonify(results), 200

    return jsonify({
        "items": enriched_items,
        "totalItems": len(enriched_items),
    }), 200


@books_bp.get("/discover")
def discover_books():
    data = get_discover_lists(limit=3)
    return jsonify(data), 200


@books_bp.get("/google/<path:google_id>")
def google_books_detail(google_id: str):
    data = get_volume(google_id)

    stats_by_google_id = get_review_stats_by_google_ids([google_id])
    stats = stats_by_google_id.get(google_id, {})

    data["avg_rating"] = stats.get("avg_rating")
    data["average_rating"] = stats.get("avg_rating") or 0
    data["reviews_count"] = stats.get("reviews_count", 0)

    return jsonify(data), 200


@books_bp.get("/")
@jwt_required()
def list_books():
    user_id = int(get_jwt_identity())
    books = get_books(user_id=user_id)
    return jsonify(books), 200


@books_bp.post("/")
@jwt_required()
def add_book():
    data = require_json(request.get_json(silent=True))

    require_str(data, "title")
    require_str(data, "author")
    require_str(data, "google_id")

    user_id = int(get_jwt_identity())
    book = create_book(data, user_id)
    return jsonify(book.serialize()), 201


@books_bp.delete("/<int:book_id>")
@jwt_required()
def delete_book(book_id: int):
    user_id = int(get_jwt_identity())

    book = Book.query.filter_by(id=book_id, user_id=user_id).first()
    if not book:
        raise APIException("Book not found", status_code=404, error_type="not_found")

    db.session.delete(book)
    db.session.commit()

    return jsonify({"message": "Book deleted", "id": book_id}), 200


@books_bp.get("/<int:book_id>")
def get_book_detail(book_id: int):
    book = Book.query.get(book_id)
    if not book:
        raise APIException("Book not found", status_code=404, error_type="not_found")

    needs_refresh = (
        not book.thumbnail
        or str(book.thumbnail).startswith("http://")
        or not book.description
        or str(book.description).strip().lower() == "sin descripción disponible."
        or not book.author
        or str(book.author).strip().lower() in {"unknown", "autor desconocido"}
    )

    if needs_refresh:
        try:
            remote = get_volume(book.google_id)

            updated = False

            remote_thumbnail = remote.get("thumbnail")
            remote_description = remote.get("description")
            remote_published_date = remote.get("published_date")
            remote_authors = remote.get("authors") or []

            remote_author = ", ".join(
                [str(a).strip() for a in remote_authors if str(a).strip()]
            )
            if not remote_author:
                remote_author = None

            if (
                (not book.thumbnail or str(book.thumbnail).startswith("http://"))
                and remote_thumbnail
            ):
                book.thumbnail = remote_thumbnail
                updated = True

            if (
                (not book.description or str(book.description).strip().lower() == "sin descripción disponible.")
                and remote_description
                and str(remote_description).strip().lower() != "sin descripción disponible."
            ):
                book.description = remote_description
                updated = True

            if not book.published_date and remote_published_date:
                book.published_date = remote_published_date
                updated = True

            if (
                (not book.author or str(book.author).strip().lower() in {"unknown", "autor desconocido"})
                and remote_author
            ):
                book.author = remote_author
                updated = True

            if updated:
                db.session.commit()
                db.session.refresh(book)
        except Exception:
            pass

    related_books = Book.query.filter_by(google_id=book.google_id).all()
    related_book_ids = [b.id for b in related_books]

    reviews = (
        Review.query
        .filter(Review.book_id.in_(related_book_ids))
        .order_by(Review.id.desc())
        .all()
    )

    ratings = [r.rating for r in reviews if r.rating is not None]
    reviews_count = len(reviews)
    average_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0

    data = book.serialize()
    data["reviews"] = [r.serialize() for r in reviews]
    data["reviews_count"] = reviews_count
    data["average_rating"] = average_rating

    return jsonify(data), 200


@books_bp.put("/<int:book_id>/status")
@jwt_required()
def change_book_status(book_id: int):
    user_id = int(get_jwt_identity())
    data = require_json(request.get_json(silent=True))

    status = require_str(data, "status")
    book = update_book_status(book_id, user_id, status)

    return jsonify(book.serialize()), 200