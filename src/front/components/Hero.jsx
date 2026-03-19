import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SearchAutocomplete } from "./SearchAutocomplete.jsx";

export const Hero = ({ isLogged, books = [], user }) => {
    const nav = useNavigate();
    const [heroQuery, setHeroQuery] = useState("");
    const [closeSignal, setCloseSignal] = useState(0);

    const topBooks = useMemo(() => {
        if (!Array.isArray(books)) return [];
        return books.slice(0, 3);
    }, [books]);

    const count = Array.isArray(books) ? books.length : 0;

    const headline = isLogged
        ? `Bienvenido de nuevo${user?.username ? `, ${user.username}` : ""}`
        : "Tu biblioteca personal, simple y moderna";

    const subline = isLogged
        ? `Tienes ${count} libro${count === 1 ? "" : "s"} en tu biblioteca.`
        : "Organiza tus lecturas, descubre títulos y guarda reseñas en un solo lugar.";

    const submitHeroSearch = (e) => {
        e.preventDefault();
        const query = heroQuery.trim();
        if (!query) return;

        setCloseSignal((v) => v + 1);
        nav(`/explore?q=${encodeURIComponent(query)}`);
    };

    const submitFromAutocomplete = (title) => {
        setCloseSignal((v) => v + 1);
        nav(`/explore?q=${encodeURIComponent(title)}`);
    };

    return (
        <section className="hero-wrap py-5">
            <div className="container">
                <div className="row align-items-center g-4">
                    <div className="col-12 col-lg-6">
                        <span className="badge badge-soft px-3 py-2 rounded-pill mb-3">
                            Bookly • Modern Tech UI
                        </span>

                        <h1 className="display-5 fw-bold mb-3">{headline}</h1>
                        <p className="lead text-muted mb-4">{subline}</p>

                        <form
                            onSubmit={submitHeroSearch}
                            className="hero-search p-2 mb-3 position-relative"
                        >
                            <div className="d-flex gap-2 align-items-stretch">
                                <SearchAutocomplete
                                    value={heroQuery}
                                    onChange={setHeroQuery}
                                    onSubmit={submitFromAutocomplete}
                                    placeholder="Busca un libro, autor o tema..."
                                    inputClassName="form-control form-control-lg hero-search-input"
                                    wrapperClassName="flex-grow-1"
                                    closeSignal={closeSignal}
                                />

                                <button
                                    type="submit"
                                    className="btn btn-primary btn-lg hero-search-btn"
                                >
                                    Buscar
                                </button>
                            </div>
                        </form>

                        <div className="d-flex gap-2 mb-4">
                            <Link to="/explore" className="btn btn-outline-primary">
                                Explorar
                            </Link>

                            {!isLogged && (
                                <Link to="/auth" className="btn btn-outline-secondary">
                                    Crear cuenta
                                </Link>
                            )}
                        </div>

                        <div className="d-flex gap-3 flex-wrap">
                            <div className="hero-kpi">
                                <div className="fw-bold">{count}</div>
                                <div className="text-muted small">Libros guardados</div>
                            </div>

                            <div className="hero-kpi">
                                <div className="fw-bold">{isLogged ? "OK" : "—"}</div>
                                <div className="text-muted small">Estado sesión</div>
                            </div>

                            <div className="hero-kpi">
                                <div className="fw-bold">API</div>
                                <div className="text-muted small">React + Flask</div>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-lg-6">
                        <div className="hero-card p-4">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="fw-semibold">
                                    {isLogged ? "Tus últimos libros" : "Vista previa"}
                                </div>
                                <span className="badge badge-soft rounded-pill">
                                    {isLogged ? `${count} total` : "Demo"}
                                </span>
                            </div>

                            <div className="d-grid gap-3">
                                {isLogged ? (
                                    topBooks.length > 0 ? (
                                        topBooks.map((b) => (
                                            <div key={b.id} className="mini-card p-3">
                                                <div className="d-flex justify-content-between align-items-start gap-3">
                                                    <div>
                                                        <div className="fw-semibold">{b.title}</div>
                                                        <div className="text-muted small">{b.author}</div>
                                                    </div>
                                                    <span className="badge badge-soft rounded-pill">
                                                        #{b.id}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="mini-card p-3">
                                            <div className="fw-semibold">Aún no tienes libros</div>
                                            <div className="text-muted small">
                                                Añade tu primer libro para empezar.
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <>
                                        <div className="mini-card p-3">
                                            <div className="fw-semibold">Clean Code</div>
                                            <div className="text-muted small">Robert C. Martin</div>
                                        </div>

                                        <div className="mini-card p-3">
                                            <div className="fw-semibold">Atomic Habits</div>
                                            <div className="text-muted small">James Clear</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="text-muted small mt-3">
                                {isLogged
                                    ? "Datos reales cargados desde tu API."
                                    : "Busca un libro o explora títulos recomendados."}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};