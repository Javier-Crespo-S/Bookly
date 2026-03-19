import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { authFetch, publicFetch } from "../hooks/api.js";
import { SearchAutocomplete } from "../components/SearchAutocomplete.jsx";
import BookCard from "../components/BookCard.jsx";

const normalizeItems = (payload) => {
    if (!payload) return { items: [], total: 0 };
    if (Array.isArray(payload.items)) {
        return { items: payload.items, total: payload.totalItems ?? payload.total ?? 0 };
    }
    if (Array.isArray(payload)) {
        return { items: payload, total: payload.length };
    }
    if (Array.isArray(payload.books)) {
        return { items: payload.books, total: payload.total ?? payload.books.length };
    }
    return { items: [], total: 0 };
};

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

export const Explore = () => {
    const { store } = useGlobalReducer();
    const navigate = useNavigate();

    const isLogged = useMemo(() => !!store.token, [store.token]);

    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = (searchParams.get("q") || "").trim();

    const [q, setQ] = useState(initialQuery);
    const [typing, setTyping] = useState(initialQuery);
    const [closeSignal, setCloseSignal] = useState(0);

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [startIndex, setStartIndex] = useState(0);
    const [maxResults] = useState(12);

    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);

    const [libraryByGoogleId, setLibraryByGoogleId] = useState({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const [discoverLoading, setDiscoverLoading] = useState(false);
    const [discoverError, setDiscoverError] = useState(null);
    const [discover, setDiscover] = useState({ popular: [], new_releases: [] });

    useEffect(() => {
        const loadMine = async () => {
            try {
                const data = await authFetch("/api/books/", { method: "GET" });
                const map = {};
                for (const b of data) {
                    map[b.google_id] = b;
                }
                setLibraryByGoogleId(map);
            } catch (e) {
                console.warn("Could not load user books:", e.message);
            }
        };

        if (isLogged) {
            loadMine();
        } else {
            setLibraryByGoogleId({});
        }
    }, [isLogged]);

    const canLoadMore = useMemo(() => {
        return items.length > 0 && (total === 0 || items.length < total);
    }, [items.length, total]);

    const runSearch = async ({ reset } = { reset: true }) => {
        const query = q.trim();
        if (!query) {
            setItems([]);
            setTotal(0);
            setStartIndex(0);
            return;
        }

        setError(null);

        if (reset) {
            setLoading(true);
            setStartIndex(0);
        } else {
            setLoadingMore(true);
        }

        try {
            const idx = reset ? 0 : startIndex;
            const data = await publicFetch(
                `/api/books/search?q=${encodeURIComponent(query)}&max_results=${maxResults}&start_index=${idx}`,
                { method: "GET" }
            );

            const parsed = normalizeItems(data);

            if (reset) {
                setItems(parsed.items);
            } else {
                setItems((prev) => [...prev, ...parsed.items]);
            }

            setTotal(parsed.total);
            setStartIndex(idx + maxResults);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadDiscover = async () => {
        setDiscoverLoading(true);
        setDiscoverError(null);

        try {
            const data = await publicFetch("/api/books/discover", { method: "GET" });
            setDiscover({
                popular: data?.popular || [],
                new_releases: data?.new_releases || [],
            });
        } catch (e) {
            setDiscoverError(e.message);
        } finally {
            setDiscoverLoading(false);
        }
    };

    useEffect(() => {
        if (q) {
            runSearch({ reset: true });
        } else {
            setItems([]);
            setTotal(0);
            setStartIndex(0);
            loadDiscover();
        }
    }, [q]);

    const submitSearch = (e) => {
        e.preventDefault();
        const next = typing.trim();

        setQ(next);

        if (next) {
            setSearchParams({ q: next });
        } else {
            setSearchParams({});
        }

        setCloseSignal((v) => v + 1);
    };

    const clearSearch = () => {
        setTyping("");
        setQ("");
        setSearchParams({});
        setCloseSignal((v) => v + 1);
    };

    const addBook = async (googleId) => {
        setError(null);

        const created = await authFetch("/api/books/import", {
            method: "POST",
            body: JSON.stringify({ google_id: googleId }),
        });

        setLibraryByGoogleId((prev) => ({ ...prev, [created.google_id]: created }));
        return created;
    };

    const removeBook = async (googleId) => {
        setError(null);
        const existing = libraryByGoogleId[googleId];
        if (!existing?.id) return;

        try {
            await authFetch(`/api/books/${existing.id}`, { method: "DELETE" });
            setLibraryByGoogleId((prev) => {
                const copy = { ...prev };
                delete copy[googleId];
                return copy;
            });
        } catch (e) {
            setError(e.message);
        }
    };

    const askRemove = (googleId, title) => {
        setPendingDelete({ googleId, title });
        setConfirmOpen(true);
    };

    const cancelRemove = () => {
        setConfirmOpen(false);
        setPendingDelete(null);
    };

    const confirmRemove = async () => {
        if (!pendingDelete?.googleId) return;
        await removeBook(pendingDelete.googleId);
        cancelRemove();
    };

    const openBookPage = (item) => {
        try {
            const googleId = item?.google_id || item?.id || item?.volumeId;
            if (!googleId) return;

            const existing = libraryByGoogleId[googleId];
            if (existing?.id) {
                navigate(`/books/${existing.id}`);
                return;
            }

            navigate(`/books/google/${encodeURIComponent(googleId)}`);
        } catch (e) {
            setError(e.message || "No se pudo abrir el libro");
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

    const renderActions = (bookLike, isAdded, googleId, title) => (
        <div className="explore-actions">
            <button
                className={`btn btn-outline-primary btn-sm btn-save explore-action-btn ${isAdded ? "is-saved" : ""}`}
                type="button"
                disabled={!isLogged}
                title={
                    !isLogged
                        ? "Inicia sesión para guardar"
                        : isAdded
                            ? "Guardado (clic para eliminar)"
                            : "Guardar en mi biblioteca"
                }
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isLogged) return;
                    if (isAdded) {
                        askRemove(googleId, title || "Libro");
                    } else {
                        addBook(googleId);
                    }
                }}
            >
                <span className="btn-save-inner">
                    <i className="fa-solid fa-plus icon-plus" />
                    <i className="fa-solid fa-check icon-check" />
                    <i className="fa-regular fa-trash-can icon-trash" />
                </span>
            </button>

            {renderQuickPreview(bookLike)}
        </div>
    );

    return (
        <div className="container py-4">
            <div className="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3 mb-3">
                <div>
                    <h2 className="fw-bold mb-1">Explorar</h2>
                    <div className="text-muted">
                        Busca libros o descubre títulos populares y recientes.
                    </div>
                </div>

                <form className="d-flex gap-2 align-items-start explore-search-form" onSubmit={submitSearch}>
                    <SearchAutocomplete
                        value={typing}
                        onChange={setTyping}
                        onSubmit={(title) => {
                            setTyping(title);
                            setQ(title);
                            setSearchParams({ q: title });
                            setCloseSignal((v) => v + 1);
                        }}
                        placeholder="Buscar libros..."
                        inputClassName="form-control"
                        wrapperClassName="flex-grow-1"
                        closeSignal={closeSignal}
                    />

                    <button className="btn btn-primary" disabled={loading} type="submit">
                        {loading ? "Buscando..." : "Buscar"}
                    </button>

                    {q && (
                        <button className="btn btn-outline-primary" type="button" onClick={clearSearch}>
                            Limpiar
                        </button>
                    )}
                </form>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {q ? (
                loading ? (
                    <div className="row g-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                                <div className="card p-3" style={{ height: 280 }}>
                                    <div className="placeholder-glow">
                                        <div className="placeholder col-8 mb-2" />
                                        <div className="placeholder col-6 mb-3" />
                                        <div className="placeholder col-12 mb-2" />
                                        <div className="placeholder col-10" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="alert alert-info">No hay resultados. Prueba con otro término.</div>
                ) : (
                    <>
                        <div className="text-muted small mb-2">
                            Mostrando {items.length}
                            {total ? ` de ${total}` : ""} resultados
                        </div>

                        <div className="row g-3">
                            {items.map((it) => {
                                const googleId = it?.google_id || it?.id || it?.volumeId;
                                const isAdded = !!libraryByGoogleId[googleId];

                                return (
                                    <div key={googleId} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                                        <div className="explore-card-shell">
                                            <BookCard
                                                book={it}
                                                showDescription={false}
                                                onOpen={() => openBookPage(it)}
                                                extraBadge={
                                                    isAdded ? (
                                                        <span className="badge explore-pill rounded-pill">
                                                            <i className="fa-solid fa-check me-1" />
                                                            Añadido
                                                        </span>
                                                    ) : null
                                                }
                                            />

                                            {renderActions(it, isAdded, googleId, it?.title || "Libro")}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="d-flex justify-content-center mt-4">
                            {canLoadMore ? (
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => runSearch({ reset: false })}
                                    disabled={loadingMore}
                                    type="button"
                                >
                                    {loadingMore ? "Cargando..." : "Cargar más"}
                                </button>
                            ) : (
                                <div className="text-muted small">No hay más resultados.</div>
                            )}
                        </div>
                    </>
                )
            ) : (
                <>
                    {discoverError && <div className="alert alert-danger">{discoverError}</div>}

                    {discoverLoading ? (
                        <div className="text-muted">Cargando secciones...</div>
                    ) : (
                        <>
                            <section className="mb-5">
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <h4 className="mb-0">Libros populares</h4>

                                </div>

                                {discover.popular.length === 0 ? (
                                    <div className="alert alert-info">Todavía no hay suficientes reseñas para esta sección.</div>
                                ) : (
                                    <div className="row g-3">
                                        {discover.popular.map((book) => {
                                            const googleId = book?.google_id || book?.id || book?.volumeId;
                                            const isAdded = !!libraryByGoogleId[googleId];

                                            return (
                                                <div key={book?.id || book?.google_id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                                                    <div className="explore-card-shell">
                                                        <BookCard
                                                            book={book}
                                                            showDescription={false}
                                                            onOpen={() => openBookPage(book)}
                                                            extraBadge={
                                                                isAdded ? (
                                                                    <span className="badge explore-pill rounded-pill">
                                                                        <i className="fa-solid fa-check me-1" />
                                                                        Añadido
                                                                    </span>
                                                                ) : null
                                                            }
                                                        />

                                                        {renderActions(book, isAdded, googleId, book?.title || "Libro")}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                            <section>
                                <div className="d-flex align-items-center justify-content-between mb-3">
                                    <h4 className="mb-0">Novedades</h4>
                                </div>

                                {discover.new_releases.length === 0 ? (
                                    <div className="alert alert-info">No hay novedades valoradas en los últimos 12 meses.</div>
                                ) : (
                                    <div className="row g-3">
                                        {discover.new_releases.map((book) => {
                                            const googleId = book?.google_id || book?.id || book?.volumeId;
                                            const isAdded = !!libraryByGoogleId[googleId];

                                            return (
                                                <div key={book?.id || book?.google_id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                                                    <div className="explore-card-shell">
                                                        <BookCard
                                                            book={book}
                                                            showDescription={false}
                                                            onOpen={() => openBookPage(book)}
                                                            extraBadge={
                                                                isAdded ? (
                                                                    <span className="badge explore-pill rounded-pill">
                                                                        <i className="fa-solid fa-check me-1" />
                                                                        Añadido
                                                                    </span>
                                                                ) : null
                                                            }
                                                        />

                                                        {renderActions(book, isAdded, googleId, book?.title || "Libro")}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </>
                    )}
                </>
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
                                    <div className="fw-bold">Eliminar de tu biblioteca</div>
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