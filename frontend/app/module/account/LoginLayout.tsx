import { Outlet, useLocation } from "react-router";

import { NavBar } from "app/component/navbar/NavBar";

import { AppLayout } from "@kiesraad/ui";

export function LoginLayout() {
  const location = useLocation();

  return (
    <AppLayout>
      <NavBar location={location} />
      <Outlet />
    </AppLayout>
  );
}
