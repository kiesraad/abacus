import { Outlet, useLocation } from "react-router";

import { NavBar } from "@/components/navbar/NavBar";
import { CommitteeSessionListProvider } from "@/hooks/committee_session/CommitteeSessionListProvider";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { useNumericParam } from "@/hooks/useNumericParam";

export function ElectionLayout() {
  const electionId = useNumericParam("electionId");
  const location = useLocation();

  return (
    <ElectionProvider electionId={electionId}>
      <ElectionStatusProvider electionId={electionId}>
        <CommitteeSessionListProvider electionId={electionId}>
          <NavBar location={location} />
          <Outlet />
        </CommitteeSessionListProvider>
      </ElectionStatusProvider>
    </ElectionProvider>
  );
}
