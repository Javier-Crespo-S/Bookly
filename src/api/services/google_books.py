from __future__ import annotations

import re
import unicodedata
import requests

from src.api.utils import APIException


GOOGLE_BASE_URL = "https://www.googleapis.com/books/v1/volumes"
OPENLIBRARY_SEARCH_URL = "https://openlibrary.org/search.json"
OPENLIBRARY_BASE_URL = "https://openlibrary.org"
OPENLIBRARY_WORKS_URL = "https://openlibrary.org"


def _extract_isbn(volume_info: dict, isbn_type: str) -> str | None:
    for ident in volume_info.get("industryIdentifiers", []) or []:
        if ident.get("type") == isbn_type:
            return ident.get("identifier")
    return None


def _normalize_google_item(item: dict) -> dict:
    volume = item.get("volumeInfo", {}) or {}
    image_links = volume.get("imageLinks", {}) or {}

    thumbnail = image_links.get("thumbnail") or image_links.get("smallThumbnail")
    if thumbnail and thumbnail.startswith("http://"):
        thumbnail = thumbnail.replace("http://", "https://", 1)

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
        "thumbnail": thumbnail,
        "preview_link": volume.get("previewLink"),
        "info_link": volume.get("infoLink"),
        "isbn_10": _extract_isbn(volume, "ISBN_10"),
        "isbn_13": _extract_isbn(volume, "ISBN_13"),
        "source": "google",
    }


def _normalize_openlibrary_doc(doc: dict) -> dict:
    cover_id = doc.get("cover_i")
    work_key = doc.get("key")

    thumbnail = None
    if cover_id:
        thumbnail = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg"

    description = None
    first_sentence = doc.get("first_sentence")
    if isinstance(first_sentence, list) and first_sentence:
        description = str(first_sentence[0]).strip() or None
    elif isinstance(first_sentence, str):
        description = first_sentence.strip() or None

    return {
        "google_id": f"openlib:{work_key}" if work_key else f"openlib:isbn:{(doc.get('isbn') or ['unknown'])[0]}",
        "title": doc.get("title"),
        "subtitle": None,
        "authors": doc.get("author_name", []) or [],
        "published_date": str(doc.get("first_publish_year")) if doc.get("first_publish_year") else None,
        "categories": doc.get("subject", [])[:5] if doc.get("subject") else [],
        "description": description,
        "page_count": None,
        "language": (doc.get("language") or [None])[0],
        "thumbnail": thumbnail,
        "preview_link": None,
        "info_link": f"{OPENLIBRARY_WORKS_URL}{work_key}" if work_key else None,
        "isbn_10": None,
        "isbn_13": None,
        "source": "openlibrary",
    }


def _safe_get_json(url: str, *, timeout: int = 8) -> dict:
    headers = {
        "User-Agent": "Bookly/1.0",
        "Accept": "application/json",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=timeout)
    except requests.RequestException as e:
        raise APIException(
            "Failed to reach upstream API",
            status_code=502,
            error_type="upstream_error",
            payload={"details": str(e), "url": url},
        )

    if resp.status_code == 404:
        raise APIException(
            "Resource not found",
            status_code=404,
            error_type="not_found",
            payload={"url": url},
        )

    if resp.status_code != 200:
        body_preview = resp.text[:300] if resp.text else ""
        raise APIException(
            "Upstream API returned an error",
            status_code=502,
            error_type="upstream_error",
            payload={
                "upstream_status": resp.status_code,
                "upstream_body": body_preview,
                "url": url,
            },
        )

    try:
        return resp.json() or {}
    except ValueError:
        raise APIException(
            "Upstream API returned invalid JSON",
            status_code=502,
            error_type="upstream_error",
            payload={"url": url},
        )


def _pick_openlibrary_description(data: dict) -> str | None:
    if not isinstance(data, dict):
        return None

    description = data.get("description")
    if isinstance(description, str):
        return description.strip() or None
    if isinstance(description, dict):
        value = description.get("value")
        if isinstance(value, str):
            return value.strip() or None

    first_sentence = data.get("first_sentence")
    if isinstance(first_sentence, str):
        return first_sentence.strip() or None
    if isinstance(first_sentence, dict):
        value = first_sentence.get("value")
        if isinstance(value, str):
            return value.strip() or None
    if isinstance(first_sentence, list) and first_sentence:
        first = first_sentence[0]
        if isinstance(first, str):
            return first.strip() or None
        if isinstance(first, dict):
            value = first.get("value")
            if isinstance(value, str):
                return value.strip() or None

    notes = data.get("notes")
    if isinstance(notes, str):
        return notes.strip() or None
    if isinstance(notes, dict):
        value = notes.get("value")
        if isinstance(value, str):
            return value.strip() or None

    excerpts = data.get("excerpts") or []
    if excerpts and isinstance(excerpts, list):
        first = excerpts[0]
        if isinstance(first, dict):
            excerpt = first.get("excerpt")
            if isinstance(excerpt, str):
                return excerpt.strip() or None
            if isinstance(excerpt, dict):
                value = excerpt.get("value")
                if isinstance(value, str):
                    return value.strip() or None

    return None


def _extract_openlibrary_authors(work_data: dict) -> list[str]:
    result = []

    for author_entry in work_data.get("authors", []) or []:
        author_obj = author_entry.get("author") or {}
        author_key = author_obj.get("key")
        if not author_key:
            continue

        try:
            author_data = _safe_get_json(f"{OPENLIBRARY_BASE_URL}{author_key}.json")
        except APIException:
            continue

        name = author_data.get("name")
        if isinstance(name, str) and name.strip():
            result.append(name.strip())

    return result


def _extract_openlibrary_cover(work_data: dict, edition_data: dict | None = None) -> str | None:
    work_covers = work_data.get("covers") or []
    if work_covers:
        return f"https://covers.openlibrary.org/b/id/{work_covers[0]}-L.jpg"

    if edition_data:
        edition_covers = edition_data.get("covers") or []
        if edition_covers:
            return f"https://covers.openlibrary.org/b/id/{edition_covers[0]}-L.jpg"

    return None


def _extract_openlibrary_subjects(work_data: dict, edition_data: dict | None = None) -> list[str]:
    subjects = work_data.get("subjects") or []
    if not subjects and edition_data:
        subjects = edition_data.get("subjects") or []

    if not isinstance(subjects, list):
        return []

    result = []
    for item in subjects[:5]:
        if isinstance(item, str) and item.strip():
            result.append(item.strip())
        elif isinstance(item, dict):
            name = item.get("name")
            if isinstance(name, str) and name.strip():
                result.append(name.strip())
    return result


def _pick_best_openlibrary_edition(entries: list[dict]) -> dict | None:
    if not entries:
        return None

    def score(entry: dict) -> tuple[int, int, int]:
        covers_score = 1 if entry.get("covers") else 0
        pages_score = 1 if entry.get("number_of_pages") else 0
        desc_score = 1 if _pick_openlibrary_description(entry) else 0
        return (covers_score, pages_score, desc_score)

    valid_entries = [e for e in entries if isinstance(e, dict)]
    if not valid_entries:
        return None

    valid_entries.sort(key=score, reverse=True)
    return valid_entries[0]


def _get_first_openlibrary_edition(work_key: str) -> dict | None:
    try:
        editions_payload = _safe_get_json(f"{OPENLIBRARY_BASE_URL}{work_key}/editions.json")
    except APIException:
        return None

    entries = editions_payload.get("entries") or []
    return _pick_best_openlibrary_edition(entries)


def _extract_edition_authors(edition_data: dict) -> list[str]:
    authors = []

    for item in edition_data.get("authors", []) or []:
        if isinstance(item, dict):
            name = item.get("name")
            if isinstance(name, str) and name.strip():
                authors.append(name.strip())

    return authors


def _extract_edition_language(edition_data: dict) -> str | None:
    languages = edition_data.get("languages") or []
    if not languages:
        return None

    first = languages[0]
    if isinstance(first, dict):
        key = first.get("key")
        if isinstance(key, str) and key.startswith("/languages/"):
            return key.split("/")[-1]

    return None


def _search_openlibrary_description_for_work(work_key: str, title: str | None = None) -> str | None:
    params = {
        "q": title or work_key,
        "limit": 10,
    }

    headers = {
        "User-Agent": "Bookly/1.0",
        "Accept": "application/json",
    }

    try:
        resp = requests.get(OPENLIBRARY_SEARCH_URL, params=params, headers=headers, timeout=8)
    except requests.RequestException:
        return None

    if resp.status_code != 200:
        return None

    try:
        data = resp.json() or {}
    except ValueError:
        return None

    docs = data.get("docs", []) or []
    for doc in docs:
        if not isinstance(doc, dict):
            continue

        if doc.get("key") == work_key:
            first_sentence = doc.get("first_sentence")
            if isinstance(first_sentence, list) and first_sentence:
                value = str(first_sentence[0]).strip()
                if value:
                    return value
            if isinstance(first_sentence, str):
                value = first_sentence.strip()
                if value:
                    return value

    return None


def _normalize_match_text(value: str | None) -> str:
    if not value:
        return ""
    value = unicodedata.normalize("NFKD", str(value))
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def _google_description_fallback(title: str | None, authors: list[str] | None) -> dict | None:
    clean_title = _normalize_match_text(title)
    clean_author = _normalize_match_text(authors[0] if authors else "")

    if not clean_title:
        return None

    query = title
    if authors:
        query = f"{title} {' '.join(authors[:1])}"

    try:
        data = _search_google_books(query, max_results=5, start_index=0)
    except APIException:
        return None

    items = data.get("items", []) or []
    for item in items:
        item_title = _normalize_match_text(item.get("title"))
        item_authors = item.get("authors", []) or []
        item_author = _normalize_match_text(item_authors[0] if item_authors else "")

        title_match = clean_title and (
            clean_title == item_title
            or clean_title in item_title
            or item_title in clean_title
        )

        author_match = not clean_author or (
            clean_author == item_author
            or clean_author in item_author
            or item_author in clean_author
        )

        if title_match and author_match:
            return item

    for item in items:
        if item.get("description"):
            return item

    return None


def _get_openlibrary_work_detail(openlib_id: str) -> dict:
    raw_key = openlib_id.replace("openlib:", "", 1).strip()

    if raw_key.startswith("/works/"):
        work_key = raw_key
        work_data = _safe_get_json(f"{OPENLIBRARY_BASE_URL}{work_key}.json")
        edition_data = _get_first_openlibrary_edition(work_key)

        title = (
            work_data.get("title")
            or (edition_data.get("title") if edition_data else None)
            or "Untitled"
        )

        subtitle = (
            work_data.get("subtitle")
            or (edition_data.get("subtitle") if edition_data else None)
        )

        authors = _extract_openlibrary_authors(work_data)
        if not authors and edition_data:
            authors = _extract_edition_authors(edition_data)

        published_date = (
            work_data.get("first_publish_date")
            or (edition_data.get("publish_date") if edition_data else None)
        )

        description = _pick_openlibrary_description(work_data)
        if not description and edition_data:
            description = _pick_openlibrary_description(edition_data)
        if not description:
            description = _search_openlibrary_description_for_work(work_key, title)

        categories = _extract_openlibrary_subjects(work_data, edition_data)
        thumbnail = _extract_openlibrary_cover(work_data, edition_data)
        info_link = f"{OPENLIBRARY_BASE_URL}{work_key}"

        page_count = edition_data.get("number_of_pages") if edition_data else None
        language = _extract_edition_language(edition_data) if edition_data else None

        isbn_10 = None
        isbn_13 = None
        if edition_data:
            isbns10 = edition_data.get("isbn_10") or []
            isbns13 = edition_data.get("isbn_13") or []
            if isbns10:
                isbn_10 = isbns10[0]
            if isbns13:
                isbn_13 = isbns13[0]

        google_fallback = None
        if not description or not categories or not published_date:
            google_fallback = _google_description_fallback(title, authors)

        if google_fallback:
            if not description and google_fallback.get("description"):
                description = google_fallback.get("description")
            if not categories and google_fallback.get("categories"):
                categories = google_fallback.get("categories")[:5]
            if not published_date and google_fallback.get("published_date"):
                published_date = google_fallback.get("published_date")

        return {
            "google_id": openlib_id,
            "title": title,
            "subtitle": subtitle,
            "authors": authors or ["Autor desconocido"],
            "published_date": published_date,
            "categories": categories,
            "description": description or "Sin descripción disponible.",
            "page_count": page_count,
            "language": language,
            "thumbnail": thumbnail,
            "preview_link": None,
            "info_link": info_link,
            "isbn_10": isbn_10,
            "isbn_13": isbn_13,
            "source": "openlibrary",
        }

    if raw_key.startswith("isbn:"):
        isbn = raw_key.replace("isbn:", "", 1).strip()
        if not isbn:
            raise APIException("Invalid Open Library ISBN", status_code=400, error_type="validation_error")

        bib_data = _safe_get_json(
            f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data"
        )
        entry = bib_data.get(f"ISBN:{isbn}") or {}

        authors = [
            a.get("name").strip()
            for a in entry.get("authors", []) or []
            if isinstance(a, dict) and isinstance(a.get("name"), str) and a.get("name").strip()
        ]

        cover = entry.get("cover") or {}
        thumbnail = cover.get("large") or cover.get("medium") or cover.get("small")
        if isinstance(thumbnail, str) and thumbnail.startswith("http://"):
            thumbnail = thumbnail.replace("http://", "https://", 1)

        publish_date = entry.get("publish_date")
        subjects = [
            s.get("name").strip()
            for s in entry.get("subjects", [])[:5]
            if isinstance(s, dict) and isinstance(s.get("name"), str) and s.get("name").strip()
        ]

        description = _pick_openlibrary_description(entry)

        google_fallback = None
        if not description or not subjects or not publish_date:
            google_fallback = _google_description_fallback(entry.get("title"), authors)

        if google_fallback:
            if not description and google_fallback.get("description"):
                description = google_fallback.get("description")
            if not subjects and google_fallback.get("categories"):
                subjects = google_fallback.get("categories")[:5]
            if not publish_date and google_fallback.get("published_date"):
                publish_date = google_fallback.get("published_date")

        return {
            "google_id": openlib_id,
            "title": entry.get("title") or "Untitled",
            "subtitle": entry.get("subtitle"),
            "authors": authors or ["Autor desconocido"],
            "published_date": publish_date,
            "categories": subjects,
            "description": description or "Sin descripción disponible.",
            "page_count": entry.get("number_of_pages"),
            "language": None,
            "thumbnail": thumbnail,
            "preview_link": None,
            "info_link": entry.get("url"),
            "isbn_10": isbn if len(isbn) == 10 else None,
            "isbn_13": isbn if len(isbn) == 13 else None,
            "source": "openlibrary",
        }

    raise APIException(
        "Unsupported Open Library identifier",
        status_code=400,
        error_type="validation_error",
        payload={"google_id": openlib_id},
    )


def _search_google_books(q: str, max_results: int, start_index: int) -> dict:
    params = {
        "q": q,
        "maxResults": max_results,
        "startIndex": start_index,
        "printType": "books",
    }

    headers = {
        "User-Agent": "Bookly/1.0",
        "Accept": "application/json",
    }

    resp = requests.get(GOOGLE_BASE_URL, params=params, headers=headers, timeout=8)

    if resp.status_code == 429:
        raise APIException(
            "Google Books quota exceeded",
            status_code=429,
            error_type="upstream_error",
            payload={"upstream_status": 429},
        )

    if resp.status_code != 200:
        body_preview = resp.text[:300] if resp.text else ""
        raise APIException(
            "Google Books API returned an error",
            status_code=502,
            error_type="upstream_error",
            payload={
                "upstream_status": resp.status_code,
                "upstream_body": body_preview,
            },
        )

    try:
        data = resp.json() or {}
    except ValueError:
        raise APIException(
            "Google Books API returned invalid JSON",
            status_code=502,
            error_type="upstream_error",
        )

    items = data.get("items", []) or []

    return {
        "totalItems": data.get("totalItems", 0),
        "items": [_normalize_google_item(i) for i in items],
    }


def _search_openlibrary(q: str, max_results: int, start_index: int) -> dict:
    page = (start_index // max_results) + 1

    params = {
        "q": q,
        "page": page,
        "limit": max_results,
    }

    headers = {
        "User-Agent": "Bookly/1.0",
        "Accept": "application/json",
    }

    try:
        resp = requests.get(OPENLIBRARY_SEARCH_URL, params=params, headers=headers, timeout=8)
    except requests.RequestException as e:
        raise APIException(
            "Failed to reach Open Library API",
            status_code=502,
            error_type="upstream_error",
            payload={"details": str(e)},
        )

    if resp.status_code != 200:
        body_preview = resp.text[:300] if resp.text else ""
        raise APIException(
            "Open Library API returned an error",
            status_code=502,
            error_type="upstream_error",
            payload={
                "upstream_status": resp.status_code,
                "upstream_body": body_preview,
            },
        )

    try:
        data = resp.json() or {}
    except ValueError:
        raise APIException(
            "Open Library API returned invalid JSON",
            status_code=502,
            error_type="upstream_error",
        )

    docs = data.get("docs", []) or []

    return {
        "totalItems": data.get("numFound", 0),
        "items": [_normalize_openlibrary_doc(doc) for doc in docs],
    }


def _merge_items(primary: list[dict], secondary: list[dict], limit: int) -> list[dict]:
    merged = []
    seen = set()

    for item in primary + secondary:
        google_id = item.get("google_id")
        if not google_id or google_id in seen:
            continue
        seen.add(google_id)
        merged.append(item)
        if len(merged) >= limit:
            break

    return merged


def search_books(q: str, *, max_results: int = 10, start_index: int = 0) -> dict:
    q = (q or "").strip()
    if not q:
        raise APIException("Query param 'q' is required", status_code=400, error_type="validation_error")

    max_results = max(1, min(int(max_results), 40))
    start_index = max(0, int(start_index))

    google_items = []
    google_total = 0

    try:
        google_data = _search_google_books(q, max_results, start_index)
        google_items = google_data.get("items", []) or []
        google_total = google_data.get("totalItems", 0) or 0
    except APIException as e:
        if getattr(e, "status_code", None) != 429:
            raise

    remaining = max_results - len(google_items)
    openlibrary_items = []
    openlibrary_total = 0

    if remaining > 0:
        try:
            openlibrary_data = _search_openlibrary(q, remaining, start_index)
            openlibrary_items = openlibrary_data.get("items", []) or []
            openlibrary_total = openlibrary_data.get("totalItems", 0) or 0
        except APIException:
            openlibrary_items = []
            openlibrary_total = 0

    items = _merge_items(google_items, openlibrary_items, max_results)

    return {
        "totalItems": max(google_total, len(google_items)) + max(openlibrary_total, len(openlibrary_items)),
        "items": items,
    }


def get_volume(google_id: str) -> dict:
    google_id = (google_id or "").strip()
    if not google_id:
        raise APIException("google_id is required", status_code=400, error_type="validation_error")

    if google_id.startswith("openlib:"):
        return _get_openlibrary_work_detail(google_id)

    headers = {
        "User-Agent": "Bookly/1.0",
        "Accept": "application/json",
    }

    try:
        resp = requests.get(f"{GOOGLE_BASE_URL}/{google_id}", headers=headers, timeout=8)
    except requests.RequestException as e:
        raise APIException(
            "Failed to reach Google Books API",
            status_code=502,
            error_type="upstream_error",
            payload={"details": str(e)},
        )

    if resp.status_code == 404:
        raise APIException("Book not found in Google Books", status_code=404, error_type="not_found")

    if resp.status_code != 200:
        body_preview = resp.text[:300] if resp.text else ""
        raise APIException(
            "Google Books API returned an error",
            status_code=502,
            error_type="upstream_error",
            payload={
                "upstream_status": resp.status_code,
                "upstream_body": body_preview,
            },
        )

    try:
        data = resp.json() or {}
    except ValueError:
        raise APIException(
            "Google Books API returned invalid JSON",
            status_code=502,
            error_type="upstream_error",
        )

    return _normalize_google_item(data)