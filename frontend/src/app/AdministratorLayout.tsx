import { Outlet, useLocation } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { AppLayout } from "@/components/ui";

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
