import React, { useEffect, useRef, useState } from "react";
import { publicFetch } from "../hooks/api.js";

export const SearchAutocomplete = ({
    value,
    onChange,
    onSubmit,
    placeholder = "Buscar libros...",
    minChars = 2,
    inputClassName = "form-control",
    wrapperClassName = "",
    closeSignal = 0,
}) => {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggest, setShowSuggest] = useState(false);
    const [loadingSuggest, setLoadingSuggest] = useState(false);
    const [suggestError, setSuggestError] = useState(null);
    const [activeIndex, setActiveIndex] = useState(-1);

    const skipNextFetch = useRef(false);
    const rootRef = useRef(null);

    useEffect(() => {
        setShowSuggest(false);
        setActiveIndex(-1);
    }, [closeSignal]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setShowSuggest(false);
                setActiveIndex(-1);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const text = value.trim();

        if (skipNextFetch.current) {
            skipNextFetch.current = false;
            return;
        }

        if (!text || text.length < minChars) {
            setSuggestions([]);
            setShowSuggest(false);
            setSuggestError(null);
            setActiveIndex(-1);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setLoadingSuggest(true);
                setSuggestError(null);

                const data = await publicFetch(
                    `/api/books/search?q=${encodeURIComponent(text)}&max_results=5&start_index=0`
                );

                const nextSuggestions = Array.isArray(data?.items)
                    ? data.items
                    : Array.isArray(data)
                        ? data
                        : [];

                setSuggestions(nextSuggestions);
                setShowSuggest(true);
                setActiveIndex(-1);
            } catch (e) {
                console.warn("Autocomplete error:", e);
                setSuggestions([]);
                setShowSuggest(true);
                setSuggestError("No se pudieron cargar sugerencias");
            } finally {
                setLoadingSuggest(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [value, minChars]);

    const chooseSuggestion = (title) => {
        skipNextFetch.current = true;
        onChange(title);
        setShowSuggest(false);
        setSuggestions([]);
        setActiveIndex(-1);
        onSubmit(title);
    };

    const handleKeyDown = (e) => {
        if (!showSuggest) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => {
                if (suggestions.length === 0) return -1;
                return prev < suggestions.length - 1 ? prev + 1 : prev;
            });
        }

        if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        }

        if (e.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
            e.preventDefault();
            chooseSuggestion(suggestions[activeIndex].title);
        }

        if (e.key === "Escape") {
            setShowSuggest(false);
            setActiveIndex(-1);
        }
    };

    return (
        <div ref={rootRef} className={`position-relative search-autocomplete-root ${wrapperClassName}`}>
            <div className="input-icon">
                <i className="fa-solid fa-magnifying-glass" />
                <input
                    className={inputClassName}
                    value={value}
                    autoComplete="off"
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (value.trim().length >= minChars) setShowSuggest(true);
                    }}
                    placeholder={placeholder}
                />
            </div>

            {showSuggest && (
                <div className="hero-autocomplete">
                    {loadingSuggest && (
                        <div className="hero-suggest-item text-muted">Buscando...</div>
                    )}

                    {!loadingSuggest && suggestError && (
                        <div className="hero-suggest-item text-muted">{suggestError}</div>
                    )}

                    {!loadingSuggest && !suggestError && suggestions.length === 0 && (
                        <div className="hero-suggest-item text-muted">Sin resultados</div>
                    )}

                    {!loadingSuggest &&
                        !suggestError &&
                        suggestions.map((b, i) => {
                            const thumb =
                                b.thumbnail ||
                                b.image ||
                                b.cover_url ||
                                b.imageLinks?.thumbnail ||
                                b.imageLinks?.smallThumbnail ||
                                null;

                            const author =
                                (b.authors && b.authors[0]) || b.author || "Autor desconocido";

                            return (
                                <div
                                    key={b.google_id || b.id || `${b.title}-${i}`}
                                    className={`hero-suggest-item hero-suggest-rich ${i === activeIndex ? "active" : ""}`}
                                    onMouseDown={() => chooseSuggestion(b.title)}
                                >
                                    <div className="hero-suggest-cover">
                                        {thumb ? (
                                            <img src={thumb} alt={b.title} />
                                        ) : (
                                            <div className="hero-suggest-cover-fallback">
                                                {b.title?.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="hero-suggest-meta">
                                        <div className="fw-semibold hero-suggest-title">{b.title}</div>
                                        <div className="text-muted small hero-suggest-author">{author}</div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
};