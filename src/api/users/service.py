from src.api.extensions import db
from src.api.users.models import User
from src.api.utils import APIException


def create_user(username: str, email: str, password: str) -> User:
    username = (username or "").strip()
    email = (email or "").strip().lower()
    password = (password or "").strip()

    if not username:
        raise APIException("username is required", status_code=400, error_type="validation_error")
    if not email:
        raise APIException("email is required", status_code=400, error_type="validation_error")
    if len(password) < 6:
        raise APIException("password must be at least 6 characters", status_code=400, error_type="validation_error")

    existing_username = User.query.filter_by(username=username).first()
    if existing_username:
        raise APIException(
            "Username already registered",
            status_code=409,
            error_type="conflict",
            payload={"username": username},
        )

    existing_email = User.query.filter_by(email=email).first()
    if existing_email:
        raise APIException(
            "Email already registered",
            status_code=409,
            error_type="conflict",
            payload={"email": email},
        )

    user = User(username=username, email=email, is_active=True)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()
    db.session.refresh(user)
    return user


def get_user(user_id: int) -> User | None:
    return User.query.get(user_id)


def update_user(user_id: int, data: dict) -> User | None:
    user = get_user(user_id)
    if not user:
        return None

    if "username" in data and data["username"] is not None:
        username = str(data["username"]).strip()
        if not username:
            raise APIException("username cannot be empty", status_code=400, error_type="validation_error")

        existing = User.query.filter(User.username == username, User.id != user.id).first()
        if existing:
            raise APIException(
                "Username already registered",
                status_code=409,
                error_type="conflict",
                payload={"username": username},
            )

        user.username = username

    if "email" in data and data["email"] is not None:
        email = str(data["email"]).strip().lower()
        if not email:
            raise APIException("email cannot be empty", status_code=400, error_type="validation_error")

        existing = User.query.filter(User.email == email, User.id != user.id).first()
        if existing:
            raise APIException(
                "Email already registered",
                status_code=409,
                error_type="conflict",
                payload={"email": email},
            )

        user.email = email

    if "password" in data and data["password"] is not None:
        password = str(data["password"]).strip()
        if password:
            if len(password) < 6:
                raise APIException("password must be at least 6 characters", status_code=400, error_type="validation_error")
            user.set_password(password)

    if "is_active" in data and data["is_active"] is not None:
        if not isinstance(data["is_active"], bool):
            raise APIException("is_active must be a boolean", status_code=400, error_type="validation_error")
        user.is_active = data["is_active"]

    db.session.commit()
    db.session.refresh(user)
    return user


def delete_user(user_id: int) -> bool:
    user = get_user(user_id)
    if not user:
        return False

    db.session.delete(user)
    db.session.commit()
    return True