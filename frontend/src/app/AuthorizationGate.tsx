import { useEffect, useState } from "react";
import { Navigate, useMatches } from "react-router";

import { useApiState } from "@/api/useApiState";

import { AuthorizationDialog } from "./AuthorizationDialog";
import { EXPIRATION_DIALOG_SECONDS } from "./authorizationConstants";

export function AuthorizationGate() {
  const { user, loading, expiration, extendSession, setUser } = useApiState();
  const [sessionValidFor, setSessionValidFor] = useState<number | null>(
    // eslint-disable-next-line react-hooks/purity -- TODO: find pure alternative for Date.now()
    expiration !== null ? (expiration.getTime() - Date.now()) / 1000 : null,
  );
  const [hideDialog, setHideDialog] = useState(false);

  const matches = useMatches();
  const routeHandle = matches[matches.length - 1]?.handle;

  // check if the route is public or not
  const isPublic = routeHandle?.public || false;

  // check if the user is authorized for the current route
  const isAuthorized = user !== null && routeHandle?.roles?.includes(user.role);

  // update the current time every second when there is a session expiration
  useEffect(() => {
    if (expiration !== null) {
      const update = () => {
        const now = new Date();
        const validFor = (expiration.getTime() - now.getTime()) / 1000;
        setSessionValidFor(validFor);

        // logout after session expiration
        if (validFor <= 0 && user !== null) {
          setUser(null);
        }

        // reset hide dialog state if the session is valid for more than the expiration dialog time
        if (validFor > EXPIRATION_DIALOG_SECONDS && hideDialog) {
          setHideDialog(false);
        }
      };

      update();
      const interval = setInterval(update, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [expiration, user, setUser, hideDialog]);

  // navigate to login page if the session has expired
  if (!isPublic && sessionValidFor !== null && sessionValidFor <= 0) {
    console.error(`Session expired for ${user ? user.fullname : "unauthenticated user"}`);

    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

  // navigate to the login page if the user logged-in and does not have the correct role for the route
  if (!isPublic && !isAuthorized) {
    const route = matches[matches.length - 1]?.pathname || "unknown";
    console.error(
      `Forbidden access to route ${route}  for ${user?.role ? `role ${user.role}` : "unauthenticated user"}`,
    );

    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

  // show dialog if the session is about to expire
  if (
    !loading &&
    sessionValidFor !== null &&
    user !== null &&
    !hideDialog &&
    sessionValidFor > 0 &&
    sessionValidFor < EXPIRATION_DIALOG_SECONDS
  ) {
    return (
      <AuthorizationDialog
        sessionValidFor={sessionValidFor}
        extendSession={extendSession}
        setHideDialog={setHideDialog}
      />
    );
  }

  return null;
}
