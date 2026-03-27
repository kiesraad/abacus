import { Navigate, useMatches } from "react-router";

import { ApplicationError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { EXPIRATION_DIALOG_SECONDS } from "@/app/authorizationConstants";
import { getPostLoginPath } from "@/features/account/utils/getPostLoginPath";
import useSessionExpiration from "@/hooks/user/useSessionExpiration";
import { t } from "@/i18n/translate";

import { AuthorizationDialog } from "./ExpirationDialog";

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
 * Rules, in evaluation order:
 * - If the current route is not public and the current role is not allowed for `handle.roles`:
 *    - An unauthenticated user is redirected to the login page with `{ unauthorized: true }`
 *    - An authenticated user is presented with an unauthorized error
 * - If the current route is not public and the computed session lifetime has expired, the user is redirected to
 *   `/account/login` with `{ unauthorized: true }`.
 * - If the user is already logged in and tries to open `/account/login`, the user is redirected to the same
 *   post-login destination used by the login form: `/account/setup` for first-login users, otherwise `/elections`.
 *
 * If none of the redirect conditions apply, the guard renders the session-expiration dialog and the protected
 * children.
 */
export function AuthorizationGuard({ children }: AuthorizationGuardProps) {
  const { user, extendSession } = useApiState();
  const matches = useMatches();
  const { showDialog, sessionValidFor, setHideDialog } = useSessionExpiration(EXPIRATION_DIALOG_SECONDS);

  const routeMatch = matches[matches.length - 1];
  const isAuthenticated = user !== null;
  const isPublic = routeMatch?.handle.public;
  const isAllowed = isPublic || (user?.role && routeMatch?.handle.roles.includes(user.role));

  // if user is not allowed on this route
  if (!isAllowed) {
    const route = routeMatch?.pathname || "unknown";

    // redirect to login page if not authenticated
    if (!isAuthenticated) {
      console.error(`Forbidden access to route ${route} for unauthenticated user`);
      return <Navigate to="/account/login" state={{ unauthorized: true }} />;
    }

    // otherwise show forbidden error
    console.error(`Forbidden access to route ${route} for role ${user.role}`);
    throw new ApplicationError(t("error.forbidden_message"), "Forbidden");
  }

  // navigate to login page if the session has expired
  if (sessionValidFor !== null && sessionValidFor <= 0 && !isPublic) {
    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

  // navigate to the overview if the user is logged in and tries to access the login page
  if (routeMatch?.pathname === "/account/login" && isAuthenticated) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  return (
    <>
      {showDialog && sessionValidFor !== null && (
        <AuthorizationDialog
          sessionValidFor={sessionValidFor}
          onClose={() => {
            setHideDialog(true);
          }}
          onStayLoggedIn={() => {
            void extendSession();
            setHideDialog(true);
          }}
        />
      )}
      {children}
    </>
  );
}
