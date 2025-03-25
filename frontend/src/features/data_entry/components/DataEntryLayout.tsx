import { Outlet } from "react-router";

import { NotFoundError, useElection } from "@/api";
import { DataEntryProgress } from "@/components/form/data_entry/DataEntryProgress";
import { DataEntryProvider } from "@/components/form/data_entry/state/DataEntryProvider";
import { t } from "@/lib/i18n";
import { useNumericParam, usePollingStationStatus } from "@/lib/util";

import { Badge, PageTitle, PollingStationNumber, StickyNav } from "@kiesraad/ui";

import { AbortDataEntryControl } from "./AbortDataEntryControl";

export function DataEntryLayout() {
  const pollingStationId = useNumericParam("pollingStationId");
  const entryNumber = useNumericParam("entryNumber");
  const { election, pollingStation } = useElection(pollingStationId);
  const pollingStationStatus = usePollingStationStatus(pollingStation?.id);

  if (!pollingStation) {
    throw new NotFoundError("error.polling_station_not_found");
  }

  if (pollingStationStatus.status === "definitive") {
    throw new Error("error.polling_station_already_definitive");
  }

  return (
    <DataEntryProvider election={election} pollingStationId={pollingStation.id} entryNumber={entryNumber}>
      <PageTitle title={`${t("data_entry.title")} ${pollingStation.number} ${pollingStation.name} - Abacus`} />
      <header>
        <section className="smaller-gap">
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
          {pollingStationStatus.status && <Badge type={pollingStationStatus.status} />}
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
