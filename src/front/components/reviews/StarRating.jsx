import React, { useState } from "react";

export default function StarRating({ value = 0, onChange, size = "fs-4", readOnly = false }) {
    const [hovered, setHovered] = useState(0);
    const displayValue = hovered || value;

    return (
        <div className="d-flex gap-1 align-items-center">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    className={`btn btn-link p-0 text-decoration-none text-warning ${size}`}
                    onMouseEnter={() => !readOnly && setHovered(star)}
                    onMouseLeave={() => !readOnly && setHovered(0)}
                    onClick={() => !readOnly && onChange?.(star)}
                    aria-label={`${star} estrellas`}
                    disabled={readOnly}
                    style={{
                        lineHeight: 1,
                        border: "none",
                        background: "transparent",
                    }}
                >
                    {star <= displayValue ? "★" : "☆"}
                </button>
            ))}
        </div>
    );
}