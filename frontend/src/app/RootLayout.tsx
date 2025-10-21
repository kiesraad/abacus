import { Outlet, ScrollRestoration, useMatches } from "react-router";

import { ApplicationError } from "@/api/ApiResult";
import { useApiState } from "@/api/useApiState";
import { AirGapViolationPage } from "@/components/error/AirGapViolationPage";
import { AppFrame } from "@/components/ui/AppFrame/AppFrame";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";

import { AuthorizationDialog } from "./AuthorizationDialog";

export function RootLayout() {
  const { airGapError } = useApiState();

  const matches = useMatches();
  const { role } = useUserRole();

  const handle = matches[matches.length - 1]?.handle;
  let isAllowed = false;
  if (handle?.public) {
    isAllowed = true;
  } else if (role && handle?.roles.includes(role)) {
    isAllowed = true;
  }

  if (airGapError) {
    return <AirGapViolationPage />;
  }

  if (!isAllowed) {
    throw new ApplicationError(t("error.forbidden_message"), "Forbidden");
  }

  return (
    <AppFrame>
      <AuthorizationDialog />
      <ScrollRestoration />
      <Outlet />
    </AppFrame>
  );
}
