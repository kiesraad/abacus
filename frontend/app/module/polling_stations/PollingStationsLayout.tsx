import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";
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
        <Footer />
      </PollingStationListProvider>
    </div>
  );
}
