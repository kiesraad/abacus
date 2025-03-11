import { Navigate, useLocation } from "react-router";

import { useApiState } from "@kiesraad/api";

const ALLOW_UNAUTHORIZED = ["/account/login", "/account/logout", "/account/setup", "/dev"];

export function AuthorizationDialog() {
  const { user, loading } = useApiState();
  const location = useLocation();
  const path = location.pathname;

  // TODO show dialog when session is about to expire based on "X-Session-Expires-At" header

  if (!loading && !user && !ALLOW_UNAUTHORIZED.includes(path)) {
    // TODO: add state to show session expiration warning message when redirecting to login page
    return <Navigate to="/account/login" />;
  }

  return null;
}
