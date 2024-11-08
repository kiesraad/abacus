import { Outlet } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { AppLayout } from "@kiesraad/ui";

export function LoginLayout() {
  return (
    <AppLayout>
      <NavBar />
      <Outlet />
    </AppLayout>
  );
}
