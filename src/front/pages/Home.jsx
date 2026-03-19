import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { authFetch } from "../hooks/api.js";
import BookCard from "../components/BookCard.jsx";
import { SearchAutocomplete } from "../components/SearchAutocomplete.jsx";

export const Home = () => {
  const { store, dispatch } = useGlobalReducer();
  const navigate = useNavigate();

  const [error, setError] = useState(null);
  const [loadingBooks, setLoadingBooks] = useState(false);

  const [search, setSearch] = useState("");
  const [closeSignal, setCloseSignal] = useState(0);

  const isLogged = useMemo(() => !!store.token, [store.token]);

  const latestBooks = useMemo(() => {
    return [...store.books].slice(0, 4);
  }, [store.books]);

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

  const handleExploreSubmit = (e) => {
    e.preventDefault();
    const q = search.trim();

    if (q) {
      navigate(`/explore?q=${encodeURIComponent(q)}`);
    } else {
      navigate("/explore");
    }

    setCloseSignal((v) => v + 1);
  };

  return (
    <div id="main" className="container py-4">
      {error && <div className="alert alert-danger">{error}</div>}

      <section className="home-hero card border-0 shadow-sm mb-5 overflow-hidden">
        <div className="card-body p-4 p-lg-5">
          <div className="row g-4 align-items-center">
            <div className="col-12 col-lg-7">
              <div className="home-kicker mb-2">Tu biblioteca digital</div>

              <h1 className="home-title mb-3">
                Bienvenido{store.user?.username ? `, ${store.user.username}` : ""}
              </h1>

              <p className="home-lead mb-4">
                Comparte y descubre tu próxima gran lectura.
              </p>

              <form onSubmit={handleExploreSubmit} className="home-search d-flex gap-2">
                <SearchAutocomplete
                  value={search}
                  onChange={setSearch}
                  onSubmit={(title) => {
                    setSearch(title);
                    navigate(`/explore?q=${encodeURIComponent(title)}`);
                    setCloseSignal((v) => v + 1);
                  }}
                  placeholder="Buscar libros para explorar..."
                  inputClassName="form-control form-control-lg"
                  wrapperClassName="flex-grow-1"
                  closeSignal={closeSignal}
                />

                <button className="btn btn-primary btn-lg" type="submit">
                  Explorar
                </button>
              </form>
            </div>

            <div className="col-12 col-lg-5">
              <div className="home-info-card card border-0 h-100">
                <div className="card-body p-4">
                  <div className="fw-semibold mb-3">Qué puedes hacer en Bookly</div>

                  <div className="home-feature mb-3">
                    <div className="home-feature-icon">
                      <i className="fa-solid fa-book"></i>
                    </div>
                    <div>
                      <div className="fw-semibold">Organiza tus lecturas</div>
                      <div className="text-muted small">
                        Marca libros como leídos, en lista de deseos o abandonados.
                      </div>
                    </div>
                  </div>

                  <div className="home-feature mb-3">
                    <div className="home-feature-icon">
                      <i className="fa-solid fa-star"></i>
                    </div>
                    <div>
                      <div className="fw-semibold">Valora y reseña</div>
                      <div className="text-muted small">
                        Deja tu puntuación y comparte tu opinión.
                      </div>
                    </div>
                  </div>

                  <div className="home-feature">
                    <div className="home-feature-icon">
                      <i className="fa-solid fa-compass"></i>
                    </div>
                    <div>
                      <div className="fw-semibold">Descubre nuevos títulos</div>
                      <div className="text-muted small">
                        Explora libros populares y novedades desde una sola app.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5">
        <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-3">
          <div>
            <h3 className="mb-1">Tus últimos libros añadidos</h3>
            <div className="text-muted">
              Acceso rápido a tus incorporaciones más recientes
            </div>
          </div>
        </div>

        {loadingBooks ? (
          <div className="text-muted">Cargando libros...</div>
        ) : latestBooks.length === 0 ? (
          <div className="alert alert-info">
            Aún no has añadido libros a tu biblioteca.
          </div>
        ) : (
          <div className="row g-3">
            {latestBooks.map((b) => (
              <div key={b.id} className="col-6 col-md-4 col-xl-3">
                <BookCard book={b} showDescription={false} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};