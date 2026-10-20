import { Outlet } from "react-router";

import { AppLayout } from "@/components/ui/AppLayout/AppLayout";

export function OverviewLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
