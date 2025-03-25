import { Outlet } from "react-router";

import { ElectionListProvider } from "@/api";

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
