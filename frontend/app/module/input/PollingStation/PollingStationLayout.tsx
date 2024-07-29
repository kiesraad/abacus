import { Outlet, useParams } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";

import { PollingStationFormController, PollingStationProvider, useElection } from "@kiesraad/api";

export function PollingStationLayout() {
  const { pollingStationId } = useParams();
  const { election } = useElection();

  return (
    <PollingStationProvider pollingStationId={parseInt(pollingStationId || "0")}>
      <PollingStationFormController
        election={election}
        pollingStationId={parseInt(pollingStationId || "0")}
        entryNumber={1}
      >
        <div className="app-layout">
          <nav>{election.name}</nav> {/* TODO: Add Role in front of election name */}
          <Outlet />
          <Footer />
        </div>
      </PollingStationFormController>
    </PollingStationProvider>
  );
}
