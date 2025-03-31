import { Outlet, ScrollRestoration } from "react-router";

import { AuthorizationDialog } from "@/components/authorization/AuthorizationDialog";
import { AppFrame } from "@/components/ui";

export function RootLayout() {
  return (
    <AppFrame>
      <AuthorizationDialog />
      <ScrollRestoration />
      <Outlet />
    </AppFrame>
  );
}
