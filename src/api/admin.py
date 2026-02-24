# api/admin.py
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from sqlalchemy import inspect
from src.api.extensions import db
from src.api.users.models import User
from src.api.books.models import Book
from src.api.reviews.models import Review


def table_exists(model, app):
    with app.app_context():  
        inspector = inspect(db.engine)
        return model.__tablename__ in inspector.get_table_names()

def setup_admin(app):
    admin = Admin(app, name="Bookly Admin")  

    models = [User, Book, Review]
    for model in models:
        if table_exists(model, app):
            from flask_admin.contrib.sqla import ModelView
            admin.add_view(ModelView(model, db.session))