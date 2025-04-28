import { NotFoundError } from "@/api/ApiResult";
import { useInitialApiGet } from "@/api/useInitialApiGet";
import { useElection } from "@/hooks/election/useElection";
import {
  DataEntryStatus,
  Election,
  EntriesDifferent,
  PoliticalGroup,
  POLLING_STATION_DATA_ENTRY_STATUS_REQUEST_PATH,
} from "@/types/generated/openapi";

interface PollingStationDataEntryStatus {
  election: Election & { political_groups: PoliticalGroup[] };
  loading: boolean;
  status: { state: EntriesDifferent; status: "EntriesDifferent" } | null;
}

export function usePollingStationDataEntryDifferences(pollingStationId: number): PollingStationDataEntryStatus {
  const { election, pollingStations } = useElection();
  const pollingStation = pollingStations.find((ps) => ps.id === pollingStationId);

  if (!pollingStation) {
    throw new NotFoundError("error.polling_station_not_found");
  }

  const path: POLLING_STATION_DATA_ENTRY_STATUS_REQUEST_PATH = `/api/polling_stations/${pollingStationId}/data_entries`;
  const { requestState } = useInitialApiGet<DataEntryStatus>(path);

  // render generic error page when any error occurs
  if (requestState.status === "api-error") {
    throw requestState.error;
  }

  // only allow polling stations with status "EntriesDifferent" to be resolved
  if (requestState.status === "success" && requestState.data.status !== "EntriesDifferent") {
    throw new NotFoundError("error.polling_station_not_found");
  }

  return {
    election,
    loading: requestState.status === "loading",
    status:
      requestState.status === "success" && requestState.data.status === "EntriesDifferent" ? requestState.data : null,
  };
}
