import { Navigate, useMatches } from "react-router";

import { ApplicationError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { EXPIRATION_DIALOG_SECONDS } from "@/app/authorizationConstants";
import useSessionExpiration from "@/hooks/user/useSessionExpiration";
import { t } from "@/i18n/translate";

import { ExpirationDialog } from "./ExpirationDialog";

interface AuthorizationGuardProps {
  children: React.ReactNode;
}

export function AuthorizationGuard({ children }: AuthorizationGuardProps) {
  const { user, extendSession } = useApiState();
  const matches = useMatches();
  const { showDialog, sessionValidFor } = useSessionExpiration(EXPIRATION_DIALOG_SECONDS);

  const routeMatch = matches[matches.length - 1];
  const isAuthenticated = user !== null;
  const isPublic = routeMatch?.handle.public;
  const isAllowed = isPublic || (user?.role && routeMatch?.handle.roles.includes(user.role));
  const accountRequiresSetup = isAuthenticated && (!user.fullname || user.needs_password_change);

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

  // restrict account that requires setup to the account setup page and logout page
  if (accountRequiresSetup && routeMatch?.pathname !== "/account/setup" && routeMatch?.pathname !== "/account/logout") {
    return <Navigate to="/account/setup" replace />;
  }

  // navigate to the overview if the user is logged in and tries to access the login page
  if (routeMatch?.pathname === "/account/login" && isAuthenticated) {
    return <Navigate to="/elections" replace />;
  }

  return (
    <>
      {showDialog && sessionValidFor !== null && (
        <ExpirationDialog
          sessionValidFor={sessionValidFor}
          onStayLoggedIn={() => {
            void extendSession();
          }}
        />
      )}
      {children}
    </>
  );
}
