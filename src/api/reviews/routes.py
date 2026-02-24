from flask import Blueprint, request, jsonify
from .service import create_review, get_reviews_by_book, delete_review

from src.api.utils import (
    require_json,
    require_int,
    require_str,
    optional_int,
    ensure_range,
)

reviews_bp = Blueprint("reviews", __name__, url_prefix="/api/reviews")


@reviews_bp.route("/books/<int:book_id>", methods=["GET"])
def list_reviews(book_id: int):
    reviews = get_reviews_by_book(book_id)
    return jsonify([
        {
            "id": r.id,
            "book_id": r.book_id,
            "user_id": r.user_id,
            "content": r.content,
            "rating": r.rating,
        }
        for r in reviews
    ]), 200


@reviews_bp.route("/books/<int:book_id>", methods=["POST"])
def add_review(book_id: int):
    data = require_json(request.get_json(silent=True))

    user_id = require_int(data, "user_id")
    content = require_str(data, "content")
    rating = optional_int(data, "rating")
    if rating is not None:
        rating = ensure_range(rating, min_value=1, max_value=5, field_name="rating")

    review = create_review(book_id, user_id, content, rating)
    if not review:
        return jsonify({"error": "Book or User not found"}), 404

    return jsonify({
        "id": review.id,
        "book_id": review.book_id,
        "user_id": review.user_id,
        "content": review.content,
        "rating": review.rating,
    }), 201


@reviews_bp.route("/<int:review_id>", methods=["DELETE"])
def remove_review(review_id: int):
    success = delete_review(review_id)
    if not success:
        return jsonify({"error": "Review not found"}), 404
    return jsonify({"message": "Review deleted"}), 200