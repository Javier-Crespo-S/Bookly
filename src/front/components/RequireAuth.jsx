import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export const RequireAuth = ({ children }) => {
    const { store } = useGlobalReducer();
    const location = useLocation();

    if (!store.token) {
        return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
    }

    return children;
};