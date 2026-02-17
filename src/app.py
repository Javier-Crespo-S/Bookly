import os
from flask import Flask, send_from_directory
from api.config import Config
from api.extensions import db, migrate, jwt
from api.admin import setup_admin
from api.commands import setup_commands

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    setup_admin(app)
    setup_commands(app)

    return app


app = create_app()

if __name__ == "__main__":
    PORT = int(os.environ.get("PORT", 3001))
    app.run(host="0.0.0.0", port=PORT, debug=True)