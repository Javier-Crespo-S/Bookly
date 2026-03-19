import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";
import logo from "../assets/LOGO_bookly.png";

export const Navbar = () => {
	const { store, dispatch } = useGlobalReducer();
	const navigate = useNavigate();

	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef(null);

	const logout = () => {
		dispatch({ type: "logout" });
		setMenuOpen(false);
		navigate("/auth");
	};

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (menuRef.current && !menuRef.current.contains(event.target)) {
				setMenuOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<nav className="navbar navbar-expand-lg border-bottom bg-white sticky-top">
			<div className="container">

				{/* LOGO */}
				<Link
					to={store.token ? "/home" : "/explore"}
					className="navbar-brand d-flex align-items-center"
				>
					<img src={logo} alt="Bookly" className="navbar-logo" />
				</Link>

				<button
					className="navbar-toggler"
					type="button"
					data-bs-toggle="collapse"
					data-bs-target="#navMain"
					aria-controls="navMain"
					aria-expanded="false"
					aria-label="Toggle navigation"
				>
					<span className="navbar-toggler-icon" />
				</button>

				<div className="collapse navbar-collapse" id="navMain">
					<ul className="navbar-nav me-auto mb-2 mb-lg-0">

						<li className="nav-item">
							<NavLink
								to="/explore"
								className={({ isActive }) =>
									`nav-link ${isActive ? "fw-semibold" : ""}`
								}
							>
								Explorar
							</NavLink>
						</li>

						{store.token && (
							<li className="nav-item">
								<NavLink
									to="/library"
									className={({ isActive }) =>
										`nav-link ${isActive ? "fw-semibold" : ""}`
									}
								>
									Mi biblioteca
								</NavLink>
							</li>
						)}

						<li className="nav-item">
							<NavLink
								to="/about"
								className={({ isActive }) =>
									`nav-link ${isActive ? "fw-semibold" : ""}`
								}
							>
								About us
							</NavLink>
						</li>

					</ul>

					<div className="d-flex align-items-center gap-2">
						{store.token ? (
							<div className="position-relative" ref={menuRef}>

								<button
									type="button"
									className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
									onClick={() => setMenuOpen((prev) => !prev)}
								>
									<span>{store.user?.username || "Cuenta"}</span>
									<i
										className={`fa-solid ${menuOpen ? "fa-chevron-up" : "fa-chevron-down"
											} small`}
									/>
								</button>

								{menuOpen && (
									<div
										className="card shadow-sm position-absolute end-0 mt-2"
										style={{ minWidth: 240, zIndex: 3000 }}
									>
										<div className="card-body p-2">

											<div className="px-2 py-1 small text-muted">
												Conectado como
											</div>

											<div className="px-2 pb-2 fw-semibold border-bottom mb-2">
												{store.user?.username}
											</div>

											<div className="d-grid gap-1">

												<Link
													to="/account"
													className="btn btn-sm btn-light text-start"
													onClick={() => setMenuOpen(false)}
												>
													Ajustes de cuenta
												</Link>

												<button
													type="button"
													className="btn btn-sm btn-outline-danger text-start"
													onClick={logout}
												>
													Cerrar sesión
												</button>

											</div>
										</div>
									</div>
								)}
							</div>
						) : (
							<Link to="/auth" className="btn btn-primary btn-sm">
								Login
							</Link>
						)}
					</div>
				</div>
			</div>
		</nav>
	);
};