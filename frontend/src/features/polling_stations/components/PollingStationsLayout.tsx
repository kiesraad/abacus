import { Outlet } from "react-router";

import { AppLayout } from "@kiesraad/ui";

import { Footer } from "@/components/Footer";

export function PollingStationsLayout() {
  return (
    <AppLayout>
      <Outlet />
      <Footer />
    </AppLayout>
  );
}
