import { Outlet } from "react-router";

import { NotFoundError } from "@/api/ApiResult";
import { useElection } from "@/api/election/useElection";
import { PageTitle } from "@/components/page_title/PageTitle";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { Badge } from "@/components/ui/Badge/Badge";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/lib/i18n";

import { usePollingStationStatus } from "../hooks/usePollingStationStatus";
import { AbortDataEntryControl } from "./AbortDataEntryControl";
import { DataEntryProgress } from "./DataEntryProgress";
import { DataEntryProvider } from "./DataEntryProvider";

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
