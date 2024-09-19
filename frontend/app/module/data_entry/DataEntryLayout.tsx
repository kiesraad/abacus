import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";

import { ElectionStatusProvider, useElection } from "@kiesraad/api";

export function DataEntryLayout() {
  const { election } = useElection();
  return (
    <ElectionStatusProvider electionId={election.id}>
      <div className="app-layout">
        <Outlet />
        <Footer />
      </div>
    </ElectionStatusProvider>
  );
}
