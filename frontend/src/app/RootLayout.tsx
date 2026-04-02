import { Outlet, ScrollRestoration } from "react-router";

import { useApiState } from "@/api/useApiState";
import { AirGapViolationPage } from "@/components/error/AirGapViolationPage";
import { AppFrame } from "@/components/ui/AppFrame/AppFrame";

import { AuthorizationGuard } from "./AuthorizationGuard";

export function RootLayout() {
  const { airGapError } = useApiState();

  if (airGapError) {
    return <AirGapViolationPage />;
  }

  return (
    <AuthorizationGuard>
      <AppFrame>
        <ScrollRestoration />
        <Outlet />
      </AppFrame>
    </AuthorizationGuard>
  );
}
