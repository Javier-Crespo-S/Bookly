from flask import Blueprint, request, jsonify
from .service import get_books, create_book
from src.api.services.google_books import search_books, get_volume
from src.api.utils import APIException, require_json, require_str, require_int


books_bp = Blueprint("books", __name__, url_prefix="/api/books")


@books_bp.post("/import")
def import_book_from_google():
    data = require_json(request.get_json())

    google_id = require_str(data, "google_id")
    user_id = require_int(data, "user_id")

    g = get_volume(google_id)

    title = g.get("title")
    if not title:
        raise APIException("Google book has no title", status_code=502, error_type="upstream_error")

    authors = g.get("authors", [])
    author = authors[0] if authors else "Unknown"

    payload = {
        "google_id": g["google_id"],
        "title": title,
        "author": author,
        "published_date": g.get("published_date"),
    }

    book = create_book(payload, user_id)
    return jsonify(book.serialize()), 201


@books_bp.get("/search")
def google_books_search():
    q = request.args.get("q", "")
    max_results = request.args.get("max_results", 10)
    start_index = request.args.get("start_index", 0)
    return jsonify(search_books(q, max_results=max_results, start_index=start_index)), 200


@books_bp.get("/google/<string:google_id>")
def google_books_detail(google_id: str):
    return jsonify(get_volume(google_id)), 200


@books_bp.get("/")
def list_books():
    user_id_param = request.args.get("user_id")

    user_id: int | None = None
    if user_id_param is not None:
        try:
            user_id = int(user_id_param)
        except ValueError:
            raise APIException("user_id must be an integer", status_code=400, error_type="validation_error")

    books = get_books(user_id=user_id)

    return jsonify([b.serialize() for b in books]), 200
  

@books_bp.post("/")
def add_book():
    data = require_json(request.get_json())

    require_str(data, "title")
    require_str(data, "author")
    user_id = require_int(data, "user_id")

    book = create_book(data, user_id)
    return jsonify(book.serialize()), 201