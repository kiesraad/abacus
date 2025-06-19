import { Outlet, useLocation } from "react-router";

import { NavBar } from "@/components/navbar/NavBar";
import { CommitteeSessionProvider } from "@/hooks/committee_session/CommitteeSessionProvider";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { useNumericParam } from "@/hooks/useNumericParam";

export function ElectionLayout() {
  const electionId = useNumericParam("electionId");
  const location = useLocation();

  return (
    <ElectionProvider electionId={electionId}>
      <CommitteeSessionProvider electionId={electionId}>
        <ElectionStatusProvider electionId={electionId}>
          <NavBar location={location} />
          <Outlet />
        </ElectionStatusProvider>
      </CommitteeSessionProvider>
    </ElectionProvider>
  );
}
