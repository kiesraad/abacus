import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";

import { AppLayout } from "@kiesraad/ui";

export function PollingStationsLayout() {
  return (
    <AppLayout>
      <Outlet />
      <Footer />
    </AppLayout>
  );
}
