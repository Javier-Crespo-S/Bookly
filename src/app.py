import os
from flask import Flask, jsonify
from src.api.config import Config
from src.api.extensions import db, migrate, jwt
from src.api.admin import setup_admin
from src.api.commands import setup_commands
from src.api.utils import APIException
from werkzeug.exceptions import HTTPException

from src.api.users.routes import users_bp
from src.api.books.routes import books_bp
from src.api.reviews.routes import reviews_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    @app.errorhandler(APIException)
    def handle_api_error(err: APIException):
        return jsonify(err.to_dict()), err.status_code
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        return jsonify({
            "error": {
                "type": "http_error",
                "message": err.description,
                "details": {}
            }
        }), err.code

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    app.register_blueprint(users_bp)
    app.register_blueprint(books_bp)
    app.register_blueprint(reviews_bp)

    with app.app_context():
        setup_admin(app)
        setup_commands(app)

    print("\n=== Registered routes ===")
    for rule in app.url_map.iter_rules():
        print(f"{rule} -> {rule.endpoint}")
    print("========================\n")

    return app

app = create_app()

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 3001))
    app.run(host="0.0.0.0", port=PORT, debug=True)