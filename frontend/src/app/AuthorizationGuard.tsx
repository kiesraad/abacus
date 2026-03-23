import { useEffect, useState } from "react";
import { Navigate, useMatches } from "react-router";
import { useApiState } from "@/api/useApiState";
import { getPostLoginPath } from "@/features/account/utils/getPostLoginPath";
import { AuthorizationDialog } from "./AuthorizationDialog";
import { EXPIRATION_DIALOG_SECONDS } from "./authorizationConstants";

interface AuthorizationGuardProps {
  children: React.ReactNode;
}

/**
 * Guards route content based on the active route handle, the current user role and the session expiry time.
 *
 * Rules:
 * - The guard reads the last matched route from `useMatches()`. That final match is treated as the route the user
 *   is currently trying to open.
 * - A route is considered public when `handle.public` is true. Public routes bypass role-based authorization.
 * - A non-public route is accessible only when the logged-in user's role is included in `handle.roles`.
 * - While a session expiration timestamp exists, the guard recomputes the remaining session lifetime every second.
 * - When the remaining session lifetime drops to `0` or below, the user is logged out locally via `setUser(null)`.
 * - When the session is close to expiring, `AuthorizationDialog` is shown. If the dialog was hidden earlier and the
 *   session later becomes valid again for longer than `EXPIRATION_DIALOG_SECONDS`, the hidden state is reset so the
 *   warning can be shown again on a future near-expiry.
 *
 * Redirect rules, in evaluation order:
 * - If the current route is not public and the current role is not allowed for `handle.roles`, the user is
 *   redirected to `/account/login` with `{ unauthorized: true }` (this shows a message on the login page).
 * - If the current route is not public and the computed session lifetime has expired, the user is redirected to
 *   `/account/login` with `{ unauthorized: true }`.
 * - If the user is already logged in and tries to open `/account/login`, the user is redirected to the same
 *   post-login destination used by the login form: `/account/setup` for first-login users, otherwise `/elections`.
 *
 * If none of the redirect conditions apply, the guard renders the session-expiration dialog and the protected
 * children.
 */
export function AuthorizationGuard({ children }: AuthorizationGuardProps) {
  const { user, expiration, setUser } = useApiState();
  const [sessionValidFor, setSessionValidFor] = useState<number | null>(null);
  const [hideDialog, setHideDialog] = useState(false);
  const matches = useMatches();

  const routeMatch = matches[matches.length - 1];
  const isPublic = routeMatch?.handle.public;
  const isAllowed = isPublic || (user?.role && routeMatch?.handle.roles.includes(user.role));

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

  // navigate to login page if the user is not allowed to access the route
  if (!isAllowed) {
    const route = routeMatch?.pathname || "unknown";
    console.error(
      `Forbidden access to route ${route}` + ` for ${user?.role ? `role ${user.role}` : "unauthenticated user"}`,
    );

    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

  // navigate to login page if the session has expired
  if (sessionValidFor !== null && sessionValidFor <= 0 && !isPublic) {
    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

  // navigate to the overview if the user is logged in and tries to access the login page
  if (routeMatch?.pathname === "/account/login" && user !== null) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  return (
    <>
      <AuthorizationDialog sessionValidFor={sessionValidFor} hideDialog={hideDialog} setHideDialog={setHideDialog} />
      {children}
    </>
  );
}
