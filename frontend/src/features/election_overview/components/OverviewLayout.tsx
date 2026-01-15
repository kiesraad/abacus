import { Outlet } from "react-router";

import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";

export function OverviewLayout() {
  return (
    <AppLayout>
      <MessagesProvider>
        <Outlet />
      </MessagesProvider>
    </AppLayout>
  );
}
