import { Outlet, useLocation } from "react-router";

import { AppLayout } from "@kiesraad/ui";

import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/navbar/NavBar";

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
