import { Outlet } from "react-router";

import { Footer } from "app/component/footer/Footer";

import { AppLayout } from "@kiesraad/ui";

import { NavBar } from "../component/navbar/NavBar";

export function AdministratorLayout() {
  return (
    <AppLayout>
      <NavBar />
      <Outlet />
      <Footer />
    </AppLayout>
  );
}
