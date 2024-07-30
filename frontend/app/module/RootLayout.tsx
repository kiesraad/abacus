import { Outlet, ScrollRestoration } from "react-router-dom";

import { AppFrame } from "@kiesraad/ui";

export function RootLayout() {
  return (
    <AppFrame>
      <ScrollRestoration />
      <Outlet />
    </AppFrame>
  );
}
