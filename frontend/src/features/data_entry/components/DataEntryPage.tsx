import { useParams } from "react-router";

import { NotFoundError } from "@/api/ApiResult";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { DataEntryHeader } from "@/features/data_entry/components/DataEntryHeader";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { useNumericParam } from "@/hooks/useNumericParam";
import { useUser } from "@/hooks/user/useUser";
import type { FormSectionId } from "@/types/types";
import { CheckAndSaveSection } from "./check_and_save/CheckAndSaveSection";
import { DataEntryProgress } from "./DataEntryProgress";
import { DataEntryProvider } from "./DataEntryProvider";
import { DataEntrySection } from "./DataEntrySection";

export function DataEntryPage() {
  const dataEntryId = useNumericParam("dataEntryId");
  const entryNumber = useNumericParam("entryNumber");
  const { election } = useElection();
  const { statuses } = useElectionStatus();
  const user = useUser();

  // Make sure the data entry belongs to the current committee session
  const dataEntryInCurrentSession = statuses.some((status) => status.data_entry_id === dataEntryId);
  if (!dataEntryInCurrentSession) {
    throw new NotFoundError();
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
    <DataEntryProvider election={election} dataEntryId={dataEntryId} entryNumber={entryNumber}>
      <DataEntryHeader />
      <main>
        <StickyNav>
          <DataEntryProgress />
        </StickyNav>
        <article>
          {sectionId &&
            (sectionId === "save" ? (
              <CheckAndSaveSection />
            ) : (
              <DataEntrySection key={sectionId} committeeCategory={election.committee_category} />
            ))}
        </article>
      </main>
    </DataEntryProvider>
  );
}
