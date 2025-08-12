import { Outlet } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";

export function AdministratorLayout() {
  return (
    <AppLayout>
      <NavBar />
      <Outlet />
      <Footer />
    </AppLayout>
  );
}
