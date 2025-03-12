import { Outlet } from "react-router";

import { Badge, PageTitle, PollingStationNumber, StickyNav } from "@kiesraad/ui";

import { NotFoundError } from "@/api";
import { DataEntryProgress } from "@/features/data_entry/components/DataEntryProgress";
import { usePollingStationStatus } from "@/features/data_entry/hooks/usePollingStationStatus";
import { DataEntryProvider } from "@/features/data_entry/stores/DataEntryProvider";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/lib/i18n";

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
