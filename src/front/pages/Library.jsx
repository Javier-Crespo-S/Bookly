import React, { useEffect, useMemo, useState } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { authFetch } from "../hooks/api.js";
import BookCard from "../components/BookCard.jsx";

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

export const Library = () => {
    const { store, dispatch } = useGlobalReducer();
    const [error, setError] = useState(null);
    const [loadingBooks, setLoadingBooks] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const isLogged = useMemo(() => !!store.token, [store.token]);

    const loadBooks = async () => {
        setError(null);
        setLoadingBooks(true);
        try {
            const data = await authFetch("/api/books/", { method: "GET" });
            dispatch({ type: "set_books", payload: data });
        } catch (e) {
            setError(e.message);
        } finally {
            setLoadingBooks(false);
        }
    };

    useEffect(() => {
        if (isLogged) loadBooks();
    }, [isLogged]);

    const askRemove = (book) => {
        setPendingDelete(book);
        setConfirmOpen(true);
    };

    const cancelRemove = () => {
        setConfirmOpen(false);
        setPendingDelete(null);
    };

    const confirmRemove = async () => {
        if (!pendingDelete?.id) return;

        try {
            await authFetch(`/api/books/${pendingDelete.id}`, { method: "DELETE" });

            dispatch({
                type: "set_books",
                payload: store.books.filter((b) => b.id !== pendingDelete.id),
            });
        } catch (e) {
            setError(e.message);
        } finally {
            cancelRemove();
        }
    };

    const renderQuickPreview = (book) => {
        const title = book?.title || "Untitled";
        const author =
            (Array.isArray(book?.authors) && book.authors[0]) || book?.author || "Autor desconocido";

        const thumb =
            book?.thumbnail ||
            book?.image ||
            book?.cover_url ||
            book?.imageLinks?.thumbnail ||
            book?.imageLinks?.smallThumbnail ||
            null;

        const rawDescription = stripHtml(book?.description || "");
        const rawSubtitle = stripHtml(book?.subtitle || "");
        const description =
            rawDescription ||
            rawSubtitle ||
            "Abre el libro para ver la ficha completa.";

        const avgRating = book?.avg_rating ?? book?.average_rating ?? 0;
        const reviewsCount = book?.reviews_count ?? 0;

        return (
            <div className="quick-preview-wrap">
                <button
                    className="btn btn-outline-primary btn-sm explore-action-btn"
                    type="button"
                    title="Vista rápida"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    <i className="fa-regular fa-eye" />
                </button>

                <div className="quick-preview-panel">
                    <div className="quick-preview-inner">
                        <div className="quick-preview-cover">
                            {thumb ? (
                                <img src={thumb} alt={title} />
                            ) : (
                                <div className="quick-preview-fallback d-flex align-items-center justify-content-center">
                                    <span className="fw-bold">{title.slice(0, 2).toUpperCase()}</span>
                                </div>
                            )}
                        </div>

                        <div className="quick-preview-body">
                            <div className="fw-bold mb-1">{title}</div>
                            <div className="text-muted small mb-2">{author}</div>

                            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                                <div className="text-warning">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span key={star}>
                                            {star <= Math.round(Number(avgRating) || 0) ? "★" : "☆"}
                                        </span>
                                    ))}
                                </div>
                                <span className="small text-white-50">
                                    {avgRating ? Number(avgRating).toFixed(1) : "—"}
                                </span>
                                <span className="small text-white-50">
                                    ({reviewsCount} reseñas)
                                </span>
                            </div>

                            <p className="small mb-0 quick-preview-description">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div id="main" className="container py-4">
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
                <div>
                    <h2 className="mb-1">Mi biblioteca</h2>
                    <div className="text-muted">
                        Todos los libros guardados en tu cuenta
                    </div>
                </div>
            </div>

            {loadingBooks ? (
                <div className="text-muted">Cargando libros...</div>
            ) : store.books.length === 0 ? (
                <div className="alert alert-info">No tienes libros todavía.</div>
            ) : (
                <div className="row g-3">
                    {store.books.map((b) => (
                        <div key={b.id} className="col-6 col-md-4 col-xl-3">
                            <div className="explore-card-shell">
                                <BookCard book={b} showDescription={false} />

                                <div className="explore-actions">
                                    <button
                                        className="btn btn-outline-primary btn-sm btn-save explore-action-btn is-saved"
                                        type="button"
                                        title="Guardado (clic para eliminar)"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            askRemove(b);
                                        }}
                                    >
                                        <span className="btn-save-inner">
                                            <i className="fa-solid fa-plus icon-plus" />
                                            <i className="fa-solid fa-check icon-check" />
                                            <i className="fa-regular fa-trash-can icon-trash" />
                                        </span>
                                    </button>

                                    {renderQuickPreview(b)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {confirmOpen && (
                <>
                    <div
                        className="bookly-backdrop"
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) cancelRemove();
                        }}
                    />

                    <div className="bookly-modal">
                        <div
                            className="modal-dialog modal-dialog-centered"
                            style={{ maxWidth: 520 }}
                        >
                            <div className="modal-content">
                                <div className="modal-header">
                                    <div className="fw-bold">
                                        Eliminar de tu biblioteca
                                    </div>

                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={cancelRemove}
                                    />
                                </div>

                                <div className="modal-body">
                                    <div className="text-muted">
                                        ¿Seguro que quieres eliminar{" "}
                                        <strong>{pendingDelete?.title}</strong> de tu biblioteca?
                                    </div>

                                    <div className="text-muted small mt-2">
                                        Se eliminarán también sus reseñas asociadas.
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        className="btn btn-outline-primary"
                                        onClick={cancelRemove}
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        className="btn btn-danger"
                                        onClick={confirmRemove}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};