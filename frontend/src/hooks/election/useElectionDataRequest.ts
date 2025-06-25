import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import {
  CommitteeSession,
  ELECTION_DETAILS_REQUEST_PATH,
  ElectionWithPoliticalGroups,
  PollingStation,
} from "@/types/generated/openapi";

export function useElectionDataRequest(electionId: number) {
  const path: ELECTION_DETAILS_REQUEST_PATH = `/api/elections/${electionId}`;
  return useInitialApiGetWithErrors<{
    committee_session: CommitteeSession;
    election: ElectionWithPoliticalGroups;
    polling_stations: PollingStation[];
  }>(path);
}
