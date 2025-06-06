import { useEffect } from "react";
import { Navigate } from "react-router";

import { useApiState } from "@/api/useApiState";

export function Logout() {
  const { logout } = useApiState();

  // logout the user when the component is mounted
  useEffect(() => {
    void logout();
  }, [logout]);

  return <Navigate to="/account/login" />;
}
