import { Outlet } from "react-router";

import { DataEntryProgress } from "app/component/form/data_entry/DataEntryProgress";
import { DataEntryProvider } from "app/component/form/data_entry/state/DataEntryProvider";

import { NotFoundError, useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Badge, PageTitle, PollingStationNumber, StickyNav } from "@kiesraad/ui";
import { useNumericParam, usePollingStationStatus } from "@kiesraad/util";

import { AbortDataEntryControl } from "./AbortDataEntryControl";

export function DataEntryLayout() {
  const pollingStationId = useNumericParam("pollingStationId");
  const entryNumber = useNumericParam("entryNumber");
  const { election, pollingStation } = useElection(pollingStationId);
  const pollingStationStatus = usePollingStationStatus(pollingStation?.id);

  if (!pollingStation) {
    throw new NotFoundError("error.polling_station_not_found");
  }

  if (pollingStationStatus === "definitive") {
    throw new Error("error.polling_station_already_definitive");
  }

  return (
    <DataEntryProvider election={election} pollingStationId={pollingStation.id} entryNumber={entryNumber}>
      <PageTitle title={`${t("data_entry.title")} ${pollingStation.number} ${pollingStation.name} - Abacus`} />
      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
          {pollingStationStatus && <Badge type={pollingStationStatus} />}
        </section>
        <section>
          <AbortDataEntryControl />
        </section>
      </header>
      <main>
        <StickyNav>
          <DataEntryProgress />
        </StickyNav>
        <article>
          <Outlet />
        </article>
      </main>
    </DataEntryProvider>
  );
}
