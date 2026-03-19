import React from "react";
import { formatDate } from "../../utils/date.js";

export const ReviewList = ({ reviews, onDelete, currentUserId, onEdit }) => {
    if (!reviews.length) {
        return (
            <div className="text-muted">
                No hay más reseñas para este libro.
            </div>
        );
    }

    return (
        <div>
            <h5 className="mb-3">Reseñas de otros usuarios ({reviews.length})</h5>

            {reviews.map((r) => {
                const isOwner = Number(currentUserId) === Number(r.user_id);

                return (
                    <div key={r.id} className="card mb-3">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start gap-3">
                                <div>
                                    <strong>
                                        {r.user?.username || `Usuario ${r.user_id}`}
                                    </strong>

                                    {r.rating ? (
                                        <div className="text-warning">
                                            {"★".repeat(r.rating)}
                                            {"☆".repeat(5 - r.rating)}
                                        </div>
                                    ) : null}

                                    {r.created_at && (
                                        <div className="text-muted small mt-1">
                                            {formatDate(r.created_at)}
                                        </div>
                                    )}
                                </div>

                                {isOwner && (
                                    <div className="d-flex gap-2">
                                        <button
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={() => onEdit?.(r)}
                                            type="button"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => onDelete?.(r.id)}
                                            type="button"
                                        >
                                            Borrar
                                        </button>
                                    </div>
                                )}
                            </div>

                            <p className="mt-2 mb-0">{r.content}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};