import { Outlet } from "react-router-dom";

import { ElectionListProvider } from "@kiesraad/api";
import { AppLayout } from "@kiesraad/ui";

export function OverviewLayout() {
  return (
    <ElectionListProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ElectionListProvider>
  );
}
