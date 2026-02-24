from flask import Blueprint, request, jsonify
from .service import create_user, get_user, update_user, delete_user

from src.api.utils import (
    require_json,
    require_str,
)

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.route("/", methods=["POST"])
def create():
    data = require_json(request.get_json(silent=True))

    email = require_str(data, "email")
    password = require_str(data, "password")

    user = create_user(email, password)

    return jsonify({
        "id": user.id,
        "email": user.email,
        "is_active": user.is_active,
    }), 201


@users_bp.route("/<int:user_id>", methods=["GET"])
def read(user_id: int):
    user = get_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "email": user.email,
        "is_active": user.is_active,
    }), 200


@users_bp.route("/<int:user_id>", methods=["PUT"])
def update(user_id: int):
    data = require_json(request.get_json(silent=True))

    user = update_user(user_id, data)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "email": user.email,
        "is_active": user.is_active,
    }), 200


@users_bp.route("/<int:user_id>", methods=["DELETE"])
def delete(user_id: int):
    success = delete_user(user_id)
    if not success:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"message": "User deleted"}), 200