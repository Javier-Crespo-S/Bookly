from __future__ import annotations

from typing import Any
from flask import jsonify, url_for


class APIException(Exception):
    status_code = 400
    error_type = "api_error"

    def __init__(self, message: str, status_code: int | None = None, payload: dict | None = None, error_type: str | None = None):
        super().__init__(message)
        self.message = message

        if status_code is not None:
            self.status_code = status_code

        if error_type is not None:
            self.error_type = error_type

        self.payload = payload or {}

    def to_dict(self):
        return {
            "error": {
                "type": self.error_type,
                "message": self.message,
                "details": self.payload
            }
        }

def require_json(data: Any) -> dict:
    if data is None or not isinstance(data, dict):
        raise APIException("Body must be a JSON object", status_code=400)
    return data


def require_str(data: dict, key: str, *, min_len: int = 1) -> str:
    if key not in data:
        raise APIException(f"Missing field: {key}", status_code=400)

    value = data[key]
    if not isinstance(value, str):
        raise APIException(f"Field '{key}' must be a string", status_code=400)

    value = value.strip()
    if len(value) < min_len:
        raise APIException(f"Field '{key}' cannot be empty", status_code=400)

    return value


def optional_str(data: dict, key: str) -> str | None:
    if key not in data or data[key] is None:
        return None

    value = data[key]
    if not isinstance(value, str):
        raise APIException(f"Field '{key}' must be a string", status_code=400)

    value = value.strip()
    return value if value else None


def require_int(data: dict, key: str) -> int:
    if key not in data:
        raise APIException(f"Missing field: {key}", status_code=400)

    value = data[key]
   
    if isinstance(value, bool) or not isinstance(value, int):
        raise APIException(f"Field '{key}' must be an integer", status_code=400)

    return value


def optional_int(data: dict, key: str) -> int | None:
    if key not in data or data[key] is None:
        return None

    value = data[key]
    if isinstance(value, bool) or not isinstance(value, int):
        raise APIException(f"Field '{key}' must be an integer", status_code=400)

    return value


def ensure_range(value: int, *, min_value: int, max_value: int, field_name: str) -> int:
    if value < min_value or value > max_value:
        raise APIException(
            f"Field '{field_name}' must be between {min_value} and {max_value}",
            status_code=400,
        )
    return value


def has_no_empty_params(rule):
    defaults = rule.defaults if rule.defaults is not None else ()
    arguments = rule.arguments if rule.arguments is not None else ()
    return len(defaults) >= len(arguments)


def generate_sitemap(app):
    links = ["/admin/"]
    for rule in app.url_map.iter_rules():
        if "GET" in rule.methods and has_no_empty_params(rule):
            url = url_for(rule.endpoint, **(rule.defaults or {}))
            if "/admin/" not in url:
                links.append(url)

    links_html = "".join([f"<li><a href='{y}'>{y}</a></li>" for y in links])
    return f"""
        <div style="text-align: center;">
        <img style="max-height: 80px" src='https://storage.googleapis.com/breathecode/boilerplates/rigo-baby.jpeg' />
        <h1>Rigo welcomes you to your API!!</h1>
        <p>API HOST: <script>document.write('<input style="padding: 5px; width: 300px" type="text" value="'+window.location.href+'" />');</script></p>
        <p>Start working on your project by following the <a href="https://start.4geeksacademy.com/starters/full-stack" target="_blank">Quick Start</a></p>
        <p>Remember to specify a real endpoint path like: </p>
        <ul style="text-align: left;">{links_html}</ul></div>
    """