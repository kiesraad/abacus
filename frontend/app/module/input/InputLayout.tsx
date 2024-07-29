import { Outlet, useParams } from "react-router-dom";

import { PollingStationListProvider } from "@kiesraad/api";

export function InputLayout() {
  const { electionId } = useParams();
  return (
    <PollingStationListProvider electionId={parseInt(electionId ?? "", 10)}>
      <div className="app-layout">
        <Outlet />
      </div>
    </PollingStationListProvider>
  );
}
