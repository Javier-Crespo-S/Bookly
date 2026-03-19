import React, { useEffect, useState } from "react";
import { authFetch } from "../../hooks/api.js";
import StarRating from "./StarRating.jsx";

export const ReviewForm = ({
    bookId,
    onSuccess,
    existingReview = null,
    onCancelEdit = null,
}) => {
    const [content, setContent] = useState("");
    const [rating, setRating] = useState(0);
    const [loading, setLoading] = useState(false);

    const isEditing = !!existingReview;

    useEffect(() => {
        if (existingReview) {
            setContent(existingReview.content || "");
            setRating(existingReview.rating || 0);
        } else {
            setContent("");
            setRating(0);
        }
    }, [existingReview]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const trimmedContent = content.trim();

        try {
            setLoading(true);

            if (!rating) {
                throw new Error("Selecciona una valoración");
            }

            if (!trimmedContent) {
                throw new Error("Escribe una reseña");
            }

            if (isEditing) {
                await authFetch(`/api/reviews/${existingReview.id}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        content: trimmedContent,
                        rating,
                    }),
                });
            } else {
                if (!bookId) {
                    throw new Error("No se encontró el libro para guardar la reseña");
                }

                await authFetch(`/api/reviews/books/${bookId}`, {
                    method: "POST",
                    body: JSON.stringify({
                        content: trimmedContent,
                        rating,
                    }),
                });
            }

            setContent("");
            setRating(0);
            onSuccess?.();
        } catch (err) {
            alert(err.message || "Error guardando la reseña");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card mb-4">
            <div className="card-body">
                <h5 className="mb-3">
                    {isEditing ? "Editar tu reseña" : "Escribir reseña"}
                </h5>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label d-block">Valoración</label>
                        <StarRating value={rating} onChange={setRating} />
                    </div>

                    <div className="mb-3">
                        <textarea
                            className="form-control"
                            rows="4"
                            placeholder="Escribe tu reseña..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            maxLength={500}
                        />
                    </div>

                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-primary"
                            disabled={loading}
                            type="submit"
                        >
                            {loading
                                ? "Guardando..."
                                : isEditing
                                    ? "Actualizar reseña"
                                    : "Publicar reseña"}
                        </button>

                        {isEditing && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={onCancelEdit}
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};