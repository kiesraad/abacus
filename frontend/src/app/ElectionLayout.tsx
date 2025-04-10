import { Outlet, useLocation } from "react-router";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { ElectionStatusProvider } from "@/api/election/ElectionStatusProvider";
import { NavBar } from "@/components/navbar/NavBar";
import { useNumericParam } from "@/hooks/useNumericParam";

export function ElectionLayout() {
  const electionId = useNumericParam("electionId");
  const location = useLocation();

  return (
    <ElectionProvider electionId={electionId}>
      <ElectionStatusProvider electionId={electionId}>
        <NavBar location={location} />
        <Outlet />
      </ElectionStatusProvider>
    </ElectionProvider>
  );
}
