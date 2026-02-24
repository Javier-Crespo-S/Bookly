from src.api.extensions import db
from src.api.users.models import User

def create_user(email, password):
    user = User(email=email, password=password, is_active=True)
    db.session.add(user)
    db.session.commit()
    return user

def get_user(user_id):
    return User.query.get(user_id)

def update_user(user_id, data):
    user = get_user(user_id)
    if not user:
        return None
    if "email" in data:
        user.email = data["email"]
    if "password" in data:
        user.password = data["password"]
    if "is_active" in data:
        user.is_active = data["is_active"]
    db.session.commit()
    return user

def delete_user(user_id):
    user = get_user(user_id)
    if not user:
        return False
    db.session.delete(user)
    db.session.commit()
    return True