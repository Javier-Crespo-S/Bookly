import React, { useEffect, useState } from "react";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import { authFetch } from "../hooks/api.js";

export const AccountSettings = () => {
    const { store, dispatch } = useGlobalReducer();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        setUsername(store.user?.username || "");
        setEmail(store.user?.email || "");
    }, [store.user]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!store.user?.id) {
            setError("No se pudo identificar el usuario.");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const payload = {
                username: username.trim(),
                email: email.trim(),
            };

            if (password.trim()) {
                payload.password = password.trim();
            }

            const updated = await authFetch(`/api/users/${store.user.id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            dispatch({
                type: "login",
                payload: {
                    token: store.token,
                    user: updated,
                },
            });

            setPassword("");
            setMessage("Datos actualizados correctamente.");
        } catch (e2) {
            setError(e2.message || "No se pudo actualizar la cuenta.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-12 col-lg-7">
                    <h1 className="mb-3">Ajustes de cuenta</h1>
                    <div className="text-muted mb-4">
                        Actualiza tu información de usuario.
                    </div>

                    {error && <div className="alert alert-danger">{error}</div>}
                    {message && <div className="alert alert-success">{message}</div>}

                    <div className="card">
                        <div className="card-body p-4">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Nombre de usuario</label>
                                    <input
                                        className="form-control"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Nombre de usuario"
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Correo</label>
                                    <input
                                        className="form-control"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Correo"
                                        type="email"
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Nueva contraseña</label>
                                    <input
                                        className="form-control"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Dejar vacía para no cambiarla"
                                        type="password"
                                    />
                                </div>

                                <button
                                    className="btn btn-primary"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading ? "Guardando..." : "Guardar cambios"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};