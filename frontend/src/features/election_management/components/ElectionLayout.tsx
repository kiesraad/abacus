import { Outlet } from "react-router";

import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { CommitteeSessionListProvider } from "@/hooks/committee_session/CommitteeSessionListProvider";
import { useElection } from "@/hooks/election/useElection";

export function ElectionLayout() {
  const { election } = useElection();

  return (
    <CommitteeSessionListProvider electionId={election.id}>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </CommitteeSessionListProvider>
  );
}
