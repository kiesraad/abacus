import { Outlet } from "react-router";

import { Footer } from "app/component/footer/Footer";

import { ElectionListProvider } from "@kiesraad/api";
import { AppLayout } from "@kiesraad/ui";

export function OverviewLayout() {
  return (
    <ElectionListProvider>
      <AppLayout>
        <Outlet />
        <Footer />
      </AppLayout>
    </ElectionListProvider>
  );
}
