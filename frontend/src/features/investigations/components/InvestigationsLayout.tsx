import { Outlet } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";

export function InvestigationsLayout() {
  return (
    <AppLayout>
      <MessagesProvider>
        <Outlet />
      </MessagesProvider>
      <Footer />
    </AppLayout>
  );
}
