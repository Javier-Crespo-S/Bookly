from __future__ import annotations

import requests
from flask import current_app

from src.api.utils import APIException


BASE_URL = "https://www.googleapis.com/books/v1/volumes"


def _normalize_item(item: dict) -> dict:
    volume = item.get("volumeInfo", {}) or {}
    image_links = volume.get("imageLinks", {}) or {}

    return {
        "google_id": item.get("id"),
        "title": volume.get("title"),
        "subtitle": volume.get("subtitle"),
        "authors": volume.get("authors", []) or [],
        "published_date": volume.get("publishedDate"),
        "categories": volume.get("categories", []) or [],
        "description": volume.get("description"),
        "page_count": volume.get("pageCount"),
        "language": volume.get("language"),
        "thumbnail": image_links.get("thumbnail") or image_links.get("smallThumbnail"),
        "preview_link": volume.get("previewLink"),
        "info_link": volume.get("infoLink"),
        "isbn_10": _extract_isbn(volume, "ISBN_10"),
        "isbn_13": _extract_isbn(volume, "ISBN_13"),
    }


def _extract_isbn(volume_info: dict, isbn_type: str) -> str | None:
    for ident in volume_info.get("industryIdentifiers", []) or []:
        if ident.get("type") == isbn_type:
            return ident.get("identifier")
    return None


def search_books(q: str, *, max_results: int = 10, start_index: int = 0) -> dict:
    q = (q or "").strip()
    if not q:
        raise APIException("Query param 'q' is required", status_code=400, error_type="validation_error")

    max_results = max(1, min(int(max_results), 40))
    start_index = max(0, int(start_index))

    params = {
        "q": q,
        "maxResults": max_results,
        "startIndex": start_index,
        "printType": "books",
    }

    api_key = current_app.config.get("GOOGLE_BOOKS_API_KEY")
    if api_key:
        params["key"] = api_key

    try:
        resp = requests.get(BASE_URL, params=params, timeout=8)
    except requests.RequestException:
        raise APIException("Failed to reach Google Books API", status_code=502, error_type="upstream_error")

    if resp.status_code != 200:
        raise APIException(
            "Google Books API returned an error",
            status_code=502,
            error_type="upstream_error",
            payload={"upstream_status": resp.status_code},
        )

    data = resp.json() or {}
    items = data.get("items", []) or []

    return {
        "total_items": data.get("totalItems", 0),
        "items": [_normalize_item(i) for i in items],
    }


def get_volume(google_id: str) -> dict:
    google_id = (google_id or "").strip()
    if not google_id:
        raise APIException("google_id is required", status_code=400, error_type="validation_error")

    params = {}
    api_key = current_app.config.get("GOOGLE_BOOKS_API_KEY")
    if api_key:
        params["key"] = api_key

    try:
        resp = requests.get(f"{BASE_URL}/{google_id}", params=params, timeout=8)
    except requests.RequestException:
        raise APIException("Failed to reach Google Books API", status_code=502, error_type="upstream_error")

    if resp.status_code == 404:
        raise APIException("Book not found in Google Books", status_code=404, error_type="not_found")

    if resp.status_code != 200:
        raise APIException(
            "Google Books API returned an error",
            status_code=502,
            error_type="upstream_error",
            payload={"upstream_status": resp.status_code},
        )

    return _normalize_item(resp.json() or {})