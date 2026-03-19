import React from "react";
import foto from "../assets/fotoJCS.png";

export const About = () => {
    return (
        <div className="container py-5">
            <div className="about-hero-card">
                <div className="row align-items-center g-4">

                    <div className="col-12 col-lg-4">
                        <div className="about-avatar-panel">
                            <div className="about-avatar-ring">
                                <img
                                    src={foto}
                                    alt="Javier Crespo Salinas"
                                    className="about-avatar"
                                />
                            </div>

                            <div className="about-badge">
                                Full-Stack Developer
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-lg-8">
                        <div className="about-content">
                            <div className="about-kicker">
                                Sobre el autor
                            </div>

                            <h1 className="about-title">
                                Javier Crespo Salinas
                            </h1>

                            <p className="about-lead">
                                Desarrollador Full-Stack con formación en desarrollo web, orientado
                                a la construcción de aplicaciones centradas en la experiencia del
                                usuario empleando un código seguro, escalable y fácil de mantener.
                                Este proyecto refleja mi trabajo con React en frontend,
                                Flask en backend e integración de APIs externas.
                            </p>

                            <div className="about-section">
                                <h5 className="about-section-title">Sobre Bookly</h5>
                                <p className="about-text mb-0">
                                    Bookly nace como un punto de encuentro para los amantes de la lectura, donde
                                    cualquier usuario puede compartir con el resto de la comunidad los libros que ha
                                    leído, intercambiar experiencas y poder encontrar su siguiente libro gracias a
                                    la opinión del resto de usuarios.
                                </p>
                            </div>

                            <div className="about-section">
                                <h5 className="about-section-title">Posibles mejoras</h5>
                                <p className="about-text mb-0">
                                    Tenemos en mente muchas ideas de mejoras futuras y muchas otras que irán surgiendo
                                    a medida que avancemos en las que vayamos trabajando, pero entre las más
                                    interesantes tenemos la incorporación de un chatbot para recomendaciones
                                    de libros en base a nuestros gustos o libros leídos, funcionalidades sociales
                                    entre usuarios, mayor optimización del tratamiento de metadatos, caching para
                                    mejorar rendimiento y una experiencia de descubrimiento más avanzada con rankings
                                    y filtros de búsqueda más avanzados.
                                </p>
                            </div>

                            <div className="about-links">
                                <a
                                    href="https://github.com/javier-crespo-s"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-dark btn-sm me-2 mb-2"
                                >
                                    GitHub
                                </a>

                                <a
                                    href="https://linkedin.com/in/javier-crespo-salinas"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-sm mb-2"
                                >
                                    LinkedIn
                                </a>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};