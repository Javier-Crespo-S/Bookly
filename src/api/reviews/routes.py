from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from .service import (
    create_review,
    get_reviews_by_book,
    get_reviews_by_google_id,
    get_review,
    delete_review,
    update_review,
)

from src.api.utils import (
    require_json,
    require_str,
    optional_int,
    ensure_range,
    APIException,
)

reviews_bp = Blueprint("reviews", __name__, url_prefix="/api/reviews")


@reviews_bp.route("/books/<int:book_id>", methods=["GET"])
def list_reviews(book_id: int):
    reviews = get_reviews_by_book(book_id)
    return jsonify([r.serialize() for r in reviews]), 200


@reviews_bp.route("/google/<path:google_id>", methods=["GET"])
def list_reviews_by_google_id(google_id: str):
    reviews = get_reviews_by_google_id(google_id)
    return jsonify([r.serialize() for r in reviews]), 200


@reviews_bp.route("/books/<int:book_id>", methods=["POST"])
@jwt_required()
def add_review(book_id: int):
    data = require_json(request.get_json(silent=True))

    user_id = int(get_jwt_identity())
    content = require_str(data, "content")
    rating = optional_int(data, "rating")
    if rating is not None:
        rating = ensure_range(rating, min_value=1, max_value=5, field_name="rating")

    review = create_review(book_id, user_id, content, rating)
    return jsonify(review.serialize()), 201


@reviews_bp.route("/<int:review_id>", methods=["DELETE"])
@jwt_required()
def remove_review(review_id: int):
    user_id = int(get_jwt_identity())

    review = get_review(review_id)
    if not review:
        raise APIException("Review not found", status_code=404, error_type="not_found")

    if review.user_id != user_id:
        raise APIException(
            "You are not allowed to delete this review",
            status_code=403,
            error_type="forbidden",
            payload={"review_id": review_id},
        )

    delete_review(review_id)
    return jsonify({"message": "Review deleted"}), 200


@reviews_bp.route("/<int:review_id>", methods=["PUT"])
@jwt_required()
def edit_review(review_id: int):
    user_id = int(get_jwt_identity())
    data = require_json(request.get_json(silent=True))

    review = get_review(review_id)
    if not review:
        raise APIException("Review not found", status_code=404, error_type="not_found")

    if review.user_id != user_id:
        raise APIException(
            "You are not allowed to edit this review",
            status_code=403,
            error_type="forbidden",
            payload={"review_id": review_id},
        )

    content = require_str(data, "content")
    rating = optional_int(data, "rating")
    if rating is not None:
        rating = ensure_range(rating, min_value=1, max_value=5, field_name="rating")

    review = update_review(review_id, content, rating)
    return jsonify(review.serialize()), 200