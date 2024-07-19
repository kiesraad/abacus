import { Outlet } from "react-router-dom";

import { AppFrame } from "@kiesraad/ui";

export function RootLayout() {
  return (
    <AppFrame>
      <Outlet />
    </AppFrame>
  );
}
