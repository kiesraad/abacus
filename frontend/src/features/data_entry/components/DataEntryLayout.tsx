import { Outlet } from "react-router";

import { NotFoundError, useElection } from "@/api";
import { Badge, PageTitle, PollingStationNumber, StickyNav } from "@/components/ui";
import { t } from "@/lib/i18n";
import { useNumericParam } from "@/lib/util";

import { usePollingStationStatus } from "../hooks/usePollingStationStatus";
import { DataEntryProvider } from "../stores/DataEntryProvider";
import { AbortDataEntryControl } from "./AbortDataEntryControl";
import { DataEntryProgress } from "./DataEntryProgress";

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
