import { Outlet } from "react-router-dom";

import { ElectionStatusProvider, useElection } from "@kiesraad/api";

export function DataEntryLayout() {
  const { election } = useElection();
  return (
    <ElectionStatusProvider electionId={election.id}>
      <Outlet />
    </ElectionStatusProvider>
  );
}
