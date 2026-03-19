import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/date.js";

const stripHtml = (value = "") => {
    return String(value)
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();
};

const statusLabel = {
    wishlist: "Lista de deseos",
    reading: "Leyendo",
    read: "Leído",
    abandoned: "Abandonado",
};

const statusClass = {
    wishlist: "status-wishlist",
    reading: "status-reading",
    read: "status-read",
    abandoned: "status-abandoned",
};

export default function BookCard({
    book,
    showDescription = true,
    showPublishedDate = true,
    onOpen = null,
    extraBadge = null,
}) {
    const navigate = useNavigate();

    const openBook = () => {
        if (typeof onOpen === "function") {
            onOpen(book);
            return;
        }

        if (!book?.id) return;
        navigate(`/books/${book.id}`);
    };

    const imageSrc =
        book?.thumbnail ||
        book?.image ||
        book?.cover_url ||
        book?.imageLinks?.thumbnail ||
        book?.imageLinks?.smallThumbnail ||
        null;

    const title = book?.title || "Untitled";

    const author =
        book?.author ||
        (Array.isArray(book?.authors) ? book.authors.join(", ") : "Unknown author");

    const description = stripHtml(
        book?.description ||
        book?.subtitle ||
        "No description available."
    );

    const averageRating = Number(book?.average_rating ?? book?.avg_rating ?? 0);
    const reviewsCount = Number(book?.reviews_count ?? 0);

    const published =
        book?.published_date || book?.publishedDate || book?.published || null;

    const renderStars = (value = 0) => {
        const rounded = Math.round(Number(value) || 0);
        return (
            <span className="text-warning">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star}>{star <= rounded ? "★" : "☆"}</span>
                ))}
            </span>
        );
    };

    return (
        <div
            className="book-card card border-0 shadow-sm"
            style={{ cursor: "pointer" }}
            onClick={openBook}
        >
            <div className="book-card-media">
                {book?.status && (
                    <span className={`book-status-badge ${statusClass[book.status] || ""}`}>
                        {statusLabel[book.status] || book.status}
                    </span>
                )}

                {extraBadge ? (
                    <div className="book-card-extra-badge">
                        {extraBadge}
                    </div>
                ) : null}

                {imageSrc ? (
                    <img
                        src={imageSrc}
                        alt={title}
                        className="book-card-image"
                        loading="lazy"
                    />
                ) : (
                    <div className="book-card-fallback d-flex align-items-center justify-content-center">
                        <span className="fw-bold">
                            {title.slice(0, 2).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            <div className="card-body book-card-body">
                <div className="fw-semibold book-card-title mb-1">{title}</div>

                <div className="book-card-author mb-2">
                    {author}
                </div>

                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap book-card-rating">
                    <div>{renderStars(averageRating)}</div>
                    <span className="small">
                        {reviewsCount > 0 ? averageRating.toFixed(1) : "Sin reseñas"}
                    </span>
                    {reviewsCount > 0 && (
                        <span className="small text-muted">
                            ({reviewsCount})
                        </span>
                    )}
                </div>

                {showPublishedDate && published && (
                    <div className="book-card-date small">
                        <i className="fa-regular fa-calendar me-1" />
                        {formatDate(published)}
                    </div>
                )}

                {showDescription && (
                    <p className="book-card-description small mb-0 mt-2">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
}