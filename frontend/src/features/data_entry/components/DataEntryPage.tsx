import { useParams } from "react-router";

import { NotFoundError } from "@/api/ApiResult";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { DataEntryHeader } from "@/features/data_entry/components/DataEntryHeader";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUser } from "@/hooks/user/useUser.ts";
import type { FormSectionId } from "@/types/types";
import { CheckAndSaveForm } from "./check_and_save/CheckAndSaveForm";
import { DataEntryProgress } from "./DataEntryProgress";
import { DataEntryProvider } from "./DataEntryProvider";
import { DataEntrySection } from "./DataEntrySection";

export function DataEntryPage() {
  const pollingStationId = useNumericParam("pollingStationId");
  const entryNumber = useNumericParam("entryNumber");
  const { election, pollingStation } = useElection(pollingStationId);
  const user = useUser();

  if (!pollingStation) {
    throw new NotFoundError("error.polling_station_not_found");
  }

  if (entryNumber !== 1 && entryNumber !== 2) {
    throw new NotFoundError("error.data_entry_not_found");
  }

  const params = useParams<{ sectionId: FormSectionId }>();
  const sectionId = params.sectionId ?? null;

  if (!user) {
    return null;
  }

  return (
    <DataEntryProvider election={election} pollingStation={pollingStation} entryNumber={entryNumber}>
      <DataEntryHeader />
      <main>
        <StickyNav>
          <DataEntryProgress />
        </StickyNav>
        <article>
          {sectionId &&
            (sectionId === "save" ? (
              <CheckAndSaveForm />
            ) : (
              <DataEntrySection key={sectionId} committeeCategory={election.committee_category} />
            ))}
        </article>
      </main>
    </DataEntryProvider>
  );
}
