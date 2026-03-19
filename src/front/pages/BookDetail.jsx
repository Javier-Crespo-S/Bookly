import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { publicFetch, authFetch } from "../hooks/api.js";
import { ReviewForm } from "../components/reviews/ReviewForm.jsx";
import { ReviewList } from "../components/reviews/ReviewList.jsx";
import StarRating from "../components/reviews/StarRating.jsx";
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

const statusOptions = [
    { value: "wishlist", label: "Lista de deseos" },
    { value: "reading", label: "Leyendo" },
    { value: "read", label: "Leído" },
    { value: "abandoned", label: "Abandonado" },
];

export default function BookDetail() {
    const { id, googleId } = useParams();
    const { store } = useGlobalReducer();

    const [book, setBook] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [editingReview, setEditingReview] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const currentUserId =
        store?.user?.id ??
        store?.currentUser?.id ??
        null;

    const isLogged = !!store?.token;
    const isSavedBook = !!id;

    const loadSharedReviews = async (nextGoogleId) => {
        if (!nextGoogleId) {
            setReviews([]);
            return [];
        }

        const encodedGoogleId = encodeURIComponent(nextGoogleId);
        const sharedReviews = await publicFetch(`/api/reviews/google/${encodedGoogleId}`, {
            method: "GET",
        });

        const normalized = Array.isArray(sharedReviews) ? sharedReviews : [];
        setReviews(normalized);
        return normalized;
    };

    const loadBook = async () => {
        try {
            setLoading(true);
            setError("");

            let data;

            if (id) {
                data = await publicFetch(`/api/books/${id}`, { method: "GET" });
            } else if (googleId) {
                data = await publicFetch(`/api/books/google/${googleId}`, {
                    method: "GET",
                });
            } else {
                throw new Error("Libro no encontrado");
            }

            const nextGoogleId = data?.google_id || googleId || null;
            const sharedReviews = await loadSharedReviews(nextGoogleId);

            const ratings = sharedReviews
                .map((r) => Number(r.rating))
                .filter((rating) => Number.isFinite(rating) && rating > 0);

            data.reviews = sharedReviews;
            data.reviews_count = sharedReviews.length;
            data.average_rating = ratings.length
                ? Number((ratings.reduce((acc, value) => acc + value, 0) / ratings.length).toFixed(1))
                : 0;

            setBook(data);
        } catch (err) {
            setError(err.message || "Error cargando el libro");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBook();
    }, [id, googleId]);

    const myReview = useMemo(() => {
        if (!currentUserId || !reviews.length) return null;
        return reviews.find((r) => Number(r.user_id) === Number(currentUserId)) || null;
    }, [reviews, currentUserId]);

    const otherReviews = useMemo(() => {
        if (!reviews.length) return [];
        if (!currentUserId) return reviews;

        return reviews.filter(
            (r) => Number(r.user_id) !== Number(currentUserId)
        );
    }, [reviews, currentUserId]);

    useEffect(() => {
        if (!editingReview) return;
        const stillExists = reviews.find((r) => r.id === editingReview.id);
        if (stillExists) {
            setEditingReview(stillExists);
        } else {
            setEditingReview(null);
        }
    }, [reviews, editingReview]);

    const handleDeleteReview = async (reviewId) => {
        try {
            const confirmed = window.confirm("¿Seguro que quieres borrar tu reseña?");
            if (!confirmed) return;

            await authFetch(`/api/reviews/${reviewId}`, {
                method: "DELETE",
            });

            if (editingReview?.id === reviewId) {
                setEditingReview(null);
            }

            await loadBook();
        } catch (err) {
            alert(err.message || "Error borrando la reseña");
        }
    };

    const handleStatusChange = async (nextStatus) => {
        try {
            setUpdatingStatus(true);

            await authFetch(`/api/books/${id}/status`, {
                method: "PUT",
                body: JSON.stringify({ status: nextStatus }),
            });

            await loadBook();
        } catch (err) {
            alert(err.message || "No se pudo actualizar el estado");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const imageSrc =
        book?.thumbnail ||
        book?.image ||
        book?.cover_url ||
        book?.imageLinks?.thumbnail ||
        book?.imageLinks?.smallThumbnail ||
        null;

    const averageRating = book?.average_rating ?? book?.avg_rating ?? 0;
    const reviewsCount = book?.reviews_count ?? reviews.length ?? 0;

    if (loading) {
        return <div className="container py-4">Cargando libro...</div>;
    }

    if (error) {
        return <div className="container py-4 text-danger">{error}</div>;
    }

    if (!book) {
        return <div className="container py-4">Libro no encontrado.</div>;
    }

    return (
        <div className="container py-4">
            <div className="row g-4 mb-4">
                <div className="col-12 col-md-4 col-lg-3">
                    {imageSrc ? (
                        <img
                            src={imageSrc}
                            alt={book.title}
                            className="img-fluid rounded shadow-sm w-100"
                        />
                    ) : (
                        <div
                            className="d-flex align-items-center justify-content-center bg-light rounded shadow-sm"
                            style={{ minHeight: 320 }}
                        >
                            <span className="fw-bold">
                                {(book.title || "BK").slice(0, 2).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>

                <div className="col-12 col-md-8 col-lg-9">
                    <h2 className="mb-2">{book.title}</h2>

                    <div className="text-muted mb-2">
                        {book.author || (Array.isArray(book.authors) ? book.authors.join(", ") : "Autor desconocido")}
                    </div>

                    <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                        <StarRating value={Math.round(Number(averageRating) || 0)} readOnly />
                        <span className="fw-semibold">
                            {averageRating || "—"}
                        </span>
                        <span className="text-muted">
                            ({reviewsCount} reseñas)
                        </span>
                    </div>

                    {isLogged && isSavedBook && book?.status && (
                        <div className="mb-3">
                            <label className="form-label d-block mb-1">Estado en tu biblioteca</label>
                            <select
                                className="form-select"
                                value={book.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                disabled={updatingStatus}
                                style={{ maxWidth: 260 }}
                            >
                                {statusOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {book.published_date && (
                        <div className="text-muted small mb-3">
                            <i className="fa-regular fa-calendar me-1" />
                            {formatDate(book.published_date)}
                        </div>
                    )}

                    <p style={{ whiteSpace: "pre-wrap" }}>
                        {stripHtml(book.description || "No hay descripción disponible.")}
                    </p>
                </div>
            </div>

            {isLogged && isSavedBook && myReview && !editingReview && (
                <div className="card mb-4 my-review-card">
                    <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <h5 className="mb-0">Tu reseña</h5>

                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => setEditingReview(myReview)}
                                    type="button"
                                >
                                    Editar
                                </button>

                                <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteReview(myReview.id)}
                                    type="button"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>

                        <div className="mb-2">
                            <StarRating value={myReview.rating} readOnly />
                        </div>

                        {myReview.created_at && (
                            <div className="text-muted small mb-2">
                                {formatDate(myReview.created_at)}
                            </div>
                        )}

                        <p className="mb-0">{myReview.content}</p>
                    </div>
                </div>
            )}

            {isLogged && isSavedBook && (!myReview || editingReview) && (
                <ReviewForm
                    bookId={id}
                    existingReview={editingReview}
                    onSuccess={async () => {
                        setEditingReview(null);
                        await loadBook();
                    }}
                    onCancelEdit={() => setEditingReview(null)}
                />
            )}

            <ReviewList
                reviews={otherReviews}
                currentUserId={currentUserId}
                onDelete={isLogged ? handleDeleteReview : undefined}
                onEdit={isLogged ? (review) => setEditingReview(review) : undefined}
            />
        </div>
    );
}