from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from .service import create_user, get_user, update_user, delete_user
from src.api.utils import require_json, require_str, APIException

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.route("/", methods=["POST"])
def create():
    data = require_json(request.get_json(silent=True))

    username = require_str(data, "username")
    email = require_str(data, "email")
    password = require_str(data, "password")

    user = create_user(username, email, password)

    return jsonify(user.serialize()), 201


@users_bp.route("/<int:user_id>", methods=["GET"])
@jwt_required()
def read(user_id: int):
    current_user_id = int(get_jwt_identity())
    if current_user_id != user_id:
        raise APIException("Forbidden", status_code=403, error_type="forbidden")

    user = get_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(user.serialize()), 200


@users_bp.route("/<int:user_id>", methods=["PUT"])
@jwt_required()
def update(user_id: int):
    current_user_id = int(get_jwt_identity())
    if current_user_id != user_id:
        raise APIException("Forbidden", status_code=403, error_type="forbidden")

    data = require_json(request.get_json(silent=True))

    user = update_user(user_id, data)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(user.serialize()), 200


@users_bp.route("/<int:user_id>", methods=["DELETE"])
@jwt_required()
def delete(user_id: int):
    current_user_id = int(get_jwt_identity())
    if current_user_id != user_id:
        raise APIException("Forbidden", status_code=403, error_type="forbidden")

    success = delete_user(user_id)
    if not success:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"message": "User deleted"}), 200