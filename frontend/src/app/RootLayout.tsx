import { Outlet, ScrollRestoration } from "react-router";

import { useApiState } from "@/api/useApiState";
import { AirGapViolationPage } from "@/components/error/AirGapViolationPage";
import { AppFrame } from "@/components/ui/AppFrame/AppFrame";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import { AuthorizationGuard } from "./AuthorizationGuard";

export function RootLayout() {
  const { airGapError } = useApiState();

  if (airGapError) {
    return <AirGapViolationPage />;
  }

  return (
    <AuthorizationGuard>
      <AppFrame>
        <ScrollRestoration />
        <MessagesProvider>
          <Outlet />
        </MessagesProvider>
      </AppFrame>
    </AuthorizationGuard>
  );
}
