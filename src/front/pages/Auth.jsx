import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { publicFetch } from "../hooks/api.js";

export const Auth = () => {
    const { store, dispatch } = useGlobalReducer();
    const nav = useNavigate();
    const location = useLocation();

    const [tab, setTab] = useState("login");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const [identifier, setIdentifier] = useState("test@bookly.com");
    const [password, setPassword] = useState("123456");

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [pw1, setPw1] = useState("");
    const [pw2, setPw2] = useState("");

    const redirectTo = useMemo(() => location.state?.from || "/", [location.state]);

    useEffect(() => {
        if (store.token) {
            nav(redirectTo, { replace: true });
        }
    }, [store.token, nav, redirectTo]);

    const doLogin = async () => {
        setError(null);
        setLoading(true);

        try {
            const data = await publicFetch("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ identifier, password }),
            });

            dispatch({
                type: "login",
                payload: { token: data.access_token, user: data.user },
            });

            nav(redirectTo, { replace: true });
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const doRegister = async () => {
        setError(null);

        if (!username.trim()) return setError("El nombre de usuario es obligatorio.");
        if (!email.trim()) return setError("El correo es obligatorio.");
        if (pw1.length < 6) return setError("La clave debe tener al menos 6 caracteres.");
        if (pw1 !== pw2) return setError("Las claves no coinciden.");

        setLoading(true);

        try {
            await publicFetch("/api/auth/register", {
                method: "POST",
                body: JSON.stringify({
                    username,
                    email,
                    password: pw1,
                }),
            });

            setTab("login");
            setIdentifier(username);
            setPassword(pw1);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const guest = () => {
        dispatch({ type: "set_guest", payload: true });
        nav("/explore", { replace: true });
    };

    return (
        <div className="auth-wrap container py-5">
            <div className="auth-shell row g-0 w-100">

                {/* LEFT PANEL */}
                <div className="auth-left col-lg-6 p-5 d-none d-lg-flex flex-column justify-content-center">
                    <h2 className="fw-bold mb-3">Tu biblioteca digital</h2>

                    <p className="text-muted mb-4">
                        Guarda libros, escribe reseñas y descubre nuevas lecturas.
                    </p>

                    <div className="auth-bullet mb-3">
                        <div className="auth-icon">
                            <i className="fa-solid fa-book"></i>
                        </div>
                        <div>
                            <div className="fw-semibold">Gestiona tu biblioteca</div>
                            <div className="text-muted small">
                                Guarda todos tus libros favoritos en un solo lugar.
                            </div>
                        </div>
                    </div>

                    <div className="auth-bullet mb-3">
                        <div className="auth-icon">
                            <i className="fa-solid fa-star"></i>
                        </div>
                        <div>
                            <div className="fw-semibold">Valora y reseña</div>
                            <div className="text-muted small">
                                Añade opiniones y puntuaciones a tus lecturas.
                            </div>
                        </div>
                    </div>

                    <div className="auth-bullet">
                        <div className="auth-icon">
                            <i className="fa-solid fa-magnifying-glass"></i>
                        </div>
                        <div>
                            <div className="fw-semibold">Descubre libros</div>
                            <div className="text-muted small">
                                Busca nuevos títulos desde Google Books.
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL */}
                <div className="col-lg-6 p-4 p-lg-5 d-flex flex-column justify-content-center">

                    <div className="text-center mb-4">
                        <h1 className="fw-bold mb-1">Bookly</h1>
                        <div className="text-muted small">
                            Accede para gestionar tu biblioteca
                        </div>
                    </div>

                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="auth-card p-4">

                        {/* TABS */}
                        <ul className="nav nav-tabs auth-tabs mb-3 justify-content-center">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${tab === "login" ? "active" : ""}`}
                                    onClick={() => setTab("login")}
                                    type="button"
                                >
                                    Login
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${tab === "register" ? "active" : ""}`}
                                    onClick={() => setTab("register")}
                                    type="button"
                                >
                                    Registrarse
                                </button>
                            </li>
                        </ul>

                        {tab === "login" ? (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!loading) doLogin();
                                }}
                            >
                                <div className="mb-3 input-icon">
                                    <i className="fa-regular fa-user"></i>
                                    <input
                                        className="form-control"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder="usuario o email"
                                        autoComplete="username"
                                    />
                                </div>

                                <div className="mb-3 input-icon">
                                    <i className="fa-solid fa-lock"></i>
                                    <input
                                        className="form-control"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="clave"
                                        autoComplete="current-password"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100"
                                    disabled={loading}
                                >
                                    {loading ? "Entrando..." : "Entrar"}
                                </button>
                            </form>
                        ) : (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!loading) doRegister();
                                }}
                            >
                                <div className="mb-3 input-icon">
                                    <i className="fa-regular fa-user"></i>
                                    <input
                                        className="form-control"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="nombre de usuario"
                                    />
                                </div>

                                <div className="mb-3 input-icon">
                                    <i className="fa-regular fa-envelope"></i>
                                    <input
                                        className="form-control"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="correo"
                                    />
                                </div>

                                <div className="mb-3 input-icon">
                                    <i className="fa-solid fa-lock"></i>
                                    <input
                                        className="form-control"
                                        type="password"
                                        value={pw1}
                                        onChange={(e) => setPw1(e.target.value)}
                                        placeholder="clave"
                                    />
                                </div>

                                <div className="mb-3 input-icon">
                                    <i className="fa-solid fa-lock"></i>
                                    <input
                                        className="form-control"
                                        type="password"
                                        value={pw2}
                                        onChange={(e) => setPw2(e.target.value)}
                                        placeholder="confirmar clave"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100"
                                    disabled={loading}
                                >
                                    {loading ? "Creando cuenta..." : "Crear cuenta"}
                                </button>
                            </form>
                        )}

                        <div className="text-center mt-3">
                            <button
                                className="btn btn-outline-primary"
                                onClick={guest}
                                type="button"
                                disabled={loading}
                            >
                                Acceder como invitado
                            </button>
                        </div>

                    </div>

                    <div className="text-muted small text-center mt-3">
                        El modo invitado permite explorar contenido público.
                    </div>
                </div>
            </div>
        </div>
    );
};