import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";

import { PollingStationListProvider, useElection } from "@kiesraad/api";

export function InputLayout() {
  const { election } = useElection();
  return (
    <PollingStationListProvider electionId={election.id}>
      <div className="app-layout">
        <nav>{election.name}</nav> {/* TODO: Add Role in front of election name */}
        <Outlet />
        <Footer />
      </div>
    </PollingStationListProvider>
  );
}
