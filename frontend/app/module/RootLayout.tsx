import { AppFrame } from "@kiesraad/ui";
import { Outlet } from "react-router-dom";

export function RootLayout() {
  return (
    <AppFrame>
      <Outlet />
    </AppFrame>
  );
}
