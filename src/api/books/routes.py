from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from .service import get_books, create_book
from src.api.services.google_books import search_books, get_volume
from src.api.utils import APIException, require_json, require_str


books_bp = Blueprint("books", __name__, url_prefix="/api/books")
books_bp.strict_slashes = False


@books_bp.post("/import")
@jwt_required()
def import_book_from_google():
    data = require_json(request.get_json(silent=True))

    google_id = require_str(data, "google_id")
    user_id = int(get_jwt_identity())

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

    try:
        max_results = int(request.args.get("max_results", 10))
        start_index = int(request.args.get("start_index", 0))
    except ValueError:
        raise APIException("max_results and start_index must be integers", status_code=400, error_type="validation_error")

    # límites razonables para evitar abuso
    if max_results < 1 or max_results > 40:
        raise APIException("max_results must be between 1 and 40", status_code=400, error_type="validation_error")
    if start_index < 0:
        raise APIException("start_index must be >= 0", status_code=400, error_type="validation_error")

    return jsonify(search_books(q, max_results=max_results, start_index=start_index)), 200


@books_bp.get("/google/<string:google_id>")
def google_books_detail(google_id: str):
    return jsonify(get_volume(google_id)), 200


@books_bp.get("/")
@jwt_required()
def list_books():
    user_id = int(get_jwt_identity())
    books = get_books(user_id=user_id)
    return jsonify([b.serialize() for b in books]), 200


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