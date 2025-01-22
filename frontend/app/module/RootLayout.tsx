import { Outlet, ScrollRestoration } from "react-router";

import { AppFrame } from "@kiesraad/ui";

export function RootLayout() {
  return (
    <AppFrame>
      <ScrollRestoration />
      <Outlet />
    </AppFrame>
  );
}
