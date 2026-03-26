import { Loader } from "@/components/ui/Loader/Loader";
import { t, tx } from "@/i18n/translate";
import type { CommitteeSession, Election } from "@/types/generated/openapi.ts";
import { useCommitteeSessionInvestigationListRequest } from "../../hooks/useCommitteeSessionInvestigationListRequest";

export interface GSBElectionReportSectionProps {
  election: Election;
  committeeSession: CommitteeSession;
}

export function GSBElectionReportSection({ election, committeeSession }: GSBElectionReportSectionProps) {
  // We have to specifically request the investigations of the committee session the page is rendered for
  const { requestState } = useCommitteeSessionInvestigationListRequest(election.id, committeeSession.id);

  if (requestState.status === "loading") {
    return <Loader />;
  }
  if ("error" in requestState) {
    throw requestState.error;
  }

  const isFirstCommitteeSession = committeeSession.number === 1;
  const wasCorrected = requestState.data.investigations.some((i) => i.corrected_results);

  return (
    <>
      <p>
        {t(
          isFirstCommitteeSession
            ? "election_management.GSB.first_session.zip_file_explanation"
            : wasCorrected
              ? "election_management.GSB.next_session.with_corrections.zip_file_explanation"
              : "election_management.GSB.next_session.without_corrections.zip_file_explanation",
        )}
      </p>
      <ol>
        {tx(
          isFirstCommitteeSession
            ? "election_management.GSB.first_session.documents"
            : wasCorrected
              ? "election_management.GSB.next_session.with_corrections.documents"
              : "election_management.GSB.next_session.without_corrections.documents",
        )}
      </ol>
    </>
  );
}
