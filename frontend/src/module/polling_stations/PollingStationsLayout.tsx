import { Outlet } from "react-router";

import { Footer } from "@/component/footer/Footer";

import { AppLayout } from "@kiesraad/ui";

export function PollingStationsLayout() {
  return (
    <AppLayout>
      <Outlet />
      <Footer />
    </AppLayout>
  );
}
