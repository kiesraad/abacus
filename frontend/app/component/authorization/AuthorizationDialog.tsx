import { useLocation } from "react-router";

import { useApiState } from "@kiesraad/api";

const ALLOW_UNAUTHORIZED = ["/account/login", "/account/logout", "/account/setup", "/dev"];

export function AuthorizationDialog() {
  const { user, loading } = useApiState();
  const location = useLocation();
  const path = location.pathname;

  if (!loading && !user && !ALLOW_UNAUTHORIZED.includes(path)) {
    console.warn("Unauthorized access to", path);
  }

  return null;
}
