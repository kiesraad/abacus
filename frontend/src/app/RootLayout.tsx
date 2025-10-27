import { Navigate, Outlet, ScrollRestoration, useMatches } from "react-router";

import { useApiState } from "@/api/useApiState";
import { AirGapViolationPage } from "@/components/error/AirGapViolationPage";
import { AppFrame } from "@/components/ui/AppFrame/AppFrame";
import { useUserRole } from "@/hooks/user/useUserRole";

import { AuthorizationDialog } from "./AuthorizationDialog";

export function RootLayout() {
  const { airGapError } = useApiState();

  const matches = useMatches();
  const { role } = useUserRole();

  const handle = matches[matches.length - 1]?.handle;
  let isAllowed = false;
  if (handle?.public) {
    isAllowed = true;
  } else if (role && handle?.roles.includes(role)) {
    isAllowed = true;
  }

  if (airGapError) {
    return <AirGapViolationPage />;
  }

  if (!isAllowed) {
    const route = matches[matches.length - 1]?.pathname || "unknown";
    console.error(`Forbidden access to route ${route}` + ` for ${role ? `role ${role}` : "unauthenticated user"}`);

    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

  return (
    <AppFrame>
      <AuthorizationDialog />
      <ScrollRestoration />
      <Outlet />
    </AppFrame>
  );
}
