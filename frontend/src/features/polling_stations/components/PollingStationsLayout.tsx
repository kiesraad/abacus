import { Outlet } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";

export function PollingStationsLayout() {
  return (
    <AppLayout>
      <Outlet />
      <Footer />
    </AppLayout>
  );
}
