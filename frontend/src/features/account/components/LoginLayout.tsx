import { Outlet, useLocation } from "react-router";

import { AppLayout } from "@kiesraad/ui";

import { NavBar } from "@/components/navbar/NavBar";

export function LoginLayout() {
  const location = useLocation();

  return (
    <AppLayout>
      <NavBar location={location} />
      <Outlet />
    </AppLayout>
  );
}
