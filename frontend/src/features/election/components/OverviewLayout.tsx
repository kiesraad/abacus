import { Outlet } from "react-router";

import { AppLayout } from "@kiesraad/ui";

import { ElectionListProvider } from "@/hooks/election/ElectionListProvider";

export function OverviewLayout() {
  return (
    <ElectionListProvider>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ElectionListProvider>
  );
}
