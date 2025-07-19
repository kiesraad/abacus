import { useParams } from "react-router";

import { NotFoundError } from "@/api/ApiResult";
import { PageTitle } from "@/components/page_title/PageTitle";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { Badge } from "@/components/ui/Badge/Badge";
import { PollingStationNumber } from "@/components/ui/Badge/PollingStationNumber";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { FormSectionId } from "@/types/types";

import { usePollingStationStatus } from "../hooks/usePollingStationStatus";
import { AbortDataEntryControl } from "./AbortDataEntryControl";
import { CheckAndSaveForm } from "./check_and_save/CheckAndSaveForm";
import { DataEntryProgress } from "./DataEntryProgress";
import { DataEntryProvider } from "./DataEntryProvider";
import { DataEntrySection } from "./DataEntrySection";

export function DataEntryPage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const entryNumber = useNumericParam("entryNumber");
  const { committeeSession, election, pollingStation } = useElection(pollingStationId);
  const pollingStationStatus = usePollingStationStatus(pollingStation?.id);

  // Safeguard so users cannot circumvent the check via the browser's address bar
  if (committeeSession.status !== "data_entry_in_progress") {
    throw new Error(t("error.api_error.CommitteeSessionNotInProgress"));
  }

  if (!pollingStation) {
    throw new NotFoundError("error.polling_station_not_found");
  }

  if (entryNumber !== 1 && entryNumber !== 2) {
    throw new NotFoundError("error.data_entry_not_found");
  }

  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId ?? null;

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
          {sectionId && (sectionId === "save" ? <CheckAndSaveForm /> : <DataEntrySection key={sectionId} />)}
        </article>
      </main>
    </DataEntryProvider>
  );
}
