import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import type {
  CommitteeSession,
  ELECTION_DETAILS_REQUEST_PATH,
  ElectionWithPoliticalGroups,
  PollingStation,
  PollingStationInvestigation,
} from "@/types/generated/openapi";

export function useElectionDataRequest(electionId: number) {
  const path: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${electionId}`;
  return useInitialApiGetWithErrors<{
    current_committee_session: CommitteeSession;
    committee_sessions: CommitteeSession[];
    election: ElectionWithPoliticalGroups;
    polling_stations: PollingStation[];
    investigations: PollingStationInvestigation[];
  }>(path);
}
