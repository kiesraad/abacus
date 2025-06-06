import { Outlet, ScrollRestoration } from "react-router";

import { useApiState } from "@/api/useApiState";
import { AirGapViolationPage } from "@/components/error/AirGapViolationPage";
import { AppFrame } from "@/components/ui/AppFrame/AppFrame";

import { AuthorizationDialog } from "./AuthorizationDialog";

export function RootLayout() {
  const { airGapError } = useApiState();

  if (airGapError) {
    return <AirGapViolationPage />;
  }

  return (
    <AppFrame>
      <AuthorizationDialog />
      <ScrollRestoration />
      <Outlet />
    </AppFrame>
  );
}
