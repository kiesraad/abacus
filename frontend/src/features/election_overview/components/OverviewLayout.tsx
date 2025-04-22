import { Outlet } from "react-router";

import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
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
