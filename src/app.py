import os
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from src.api.config import Config
from src.api.extensions import db, migrate, jwt
from src.api.admin import setup_admin
from src.api.commands import setup_commands
from src.api.utils import APIException

from src.api.users.routes import users_bp
from src.api.books.routes import books_bp
from src.api.reviews.routes import reviews_bp
from src.api.auth.routes import auth_bp


def create_app() -> Flask:
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

    @jwt.unauthorized_loader
    def jwt_missing_token(reason: str):
        return jsonify({
            "error": {"type": "auth_error", "message": reason, "details": {}}
        }), 401

    @jwt.invalid_token_loader
    def jwt_invalid_token(reason: str):
        return jsonify({
            "error": {"type": "auth_error", "message": reason, "details": {}}
        }), 401

    @jwt.expired_token_loader
    def jwt_expired_token(jwt_header, jwt_payload):
        return jsonify({
            "error": {"type": "auth_error", "message": "Token has expired", "details": {}}
        }), 401

    app.register_blueprint(users_bp)
    app.register_blueprint(books_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(auth_bp)

    if not app.config.get("SKIP_ADMIN_SETUP", False):
        with app.app_context():
            setup_admin(app)


    with app.app_context():
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