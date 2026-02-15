import React from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken } from "../utils/api";

export default function PublicRoute({ children }) {
  const accessToken = getAccessToken();

  // If user is authenticated, redirect to home
  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  return children;
}
