import { Outlet, useLocation } from "react-router";

import { Footer } from "app/component/footer/Footer";

import { AppLayout } from "@kiesraad/ui";

import { NavBar } from "../component/navbar/NavBar";

export function AdministratorLayout() {
  const location = useLocation();
  return (
    <AppLayout>
      <NavBar location={location} />
      <Outlet />
      <Footer />
    </AppLayout>
  );
}
