import { Outlet } from "react-router-dom";

import { NavBar } from "app/component/navbar/NavBar";

import { PollingStationListProvider } from "@kiesraad/api";
import { PageTitle } from "@kiesraad/ui";
import { useNumericParam } from "@kiesraad/util";

export function PollingStationsLayout() {
  const electionId = useNumericParam("electionId");

  return (
    <div className="app-layout">
      <PageTitle title="Overzicht verkiezingen - Abacus" />
      <PollingStationListProvider electionId={electionId}>
        <NavBar />
        <Outlet />
      </PollingStationListProvider>
    </div>
  );
}
