from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from sqlalchemy import or_
from src.api.extensions import db
from src.api.users.models import User
from src.api.utils import APIException, require_json, require_str

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register():
    data = require_json(request.get_json(silent=True))

    username = require_str(data, "username", min_len=3)
    email = require_str(data, "email")
    password = require_str(data, "password", min_len=6)

    if User.query.filter_by(email=email).first():
        raise APIException(
            "Email already registered",
            status_code=409,
            error_type="conflict",
            payload={"email": email},
        )

    if User.query.filter_by(username=username).first():
        raise APIException(
            "Username already registered",
            status_code=409,
            error_type="conflict",
            payload={"username": username},
        )

    user = User(username=username, email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    return jsonify(user=user.serialize()), 201


@auth_bp.post("/login")
def login():
    data = require_json(request.get_json(silent=True))

    identifier = require_str(data, "identifier")
    password = require_str(data, "password")

    user = User.query.filter(
        or_(User.email == identifier, User.username == identifier)
    ).first()

    if not user or not user.check_password(password):
        raise APIException("Invalid credentials", status_code=401, error_type="auth_error")

    access_token = create_access_token(identity=str(user.id))
    return jsonify(access_token=access_token, user=user.serialize()), 200