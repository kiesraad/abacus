import { Outlet, ScrollRestoration } from "react-router";

import { AppFrame } from "@/components/ui/AppFrame/AppFrame";

import { AuthorizationDialog } from "./AuthorizationDialog";

export function RootLayout() {
  return (
    <AppFrame>
      <AuthorizationDialog />
      <ScrollRestoration />
      <Outlet />
    </AppFrame>
  );
}
