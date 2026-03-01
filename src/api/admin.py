from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView

from src.api.extensions import db
from src.api.users.models import User
from src.api.books.models import Book
from src.api.reviews.models import Review


def setup_admin(app):
    admin = Admin(app, name="Bookly Admin")

    admin.add_view(ModelView(User, db.session))
    admin.add_view(ModelView(Book, db.session))
    admin.add_view(ModelView(Review, db.session))

    return admin