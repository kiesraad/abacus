import { Outlet, ScrollRestoration } from "react-router";

import { AirGapViolationDialog } from "@/components/error/AirGapviolationDialog";
import { AppFrame } from "@/components/ui/AppFrame/AppFrame";

import { AuthorizationDialog } from "./AuthorizationDialog";

export function RootLayout() {
  return (
    <AppFrame>
      <AuthorizationDialog />
      <ScrollRestoration />
      <AirGapViolationDialog />
      <Outlet />
    </AppFrame>
  );
}
