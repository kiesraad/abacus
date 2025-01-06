import { Outlet } from "react-router";

import { Footer } from "app/component/footer/Footer";

import { AppLayout } from "@kiesraad/ui";

export function AdministratorLayout() {
  return (
    <AppLayout>
      <Outlet />
      <Footer />
    </AppLayout>
  );
}
