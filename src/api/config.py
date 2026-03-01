import os
from datetime import timedelta
from pathlib import Path

class Config:
    BASE_DIR = Path(__file__).resolve().parents[2]

    DB_PATH = BASE_DIR / "instance" / "bookly.db"
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{DB_PATH.as_posix()}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "my1234FAVOURITEpass")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_IDENTITY_CLAIM = "identity"