import * as React from "react";

import {
  ApiError,
  NetworkError,
  POLLING_STATION_CREATE_REQUEST_BODY,
  POLLING_STATION_CREATE_REQUEST_PATH,
  PollingStation,
  PollingStationRequest,
  useApi,
} from "@kiesraad/api";

// type FieldErrors = Partial<{
//   [key in keyof PollingStation]: string;
// }>;

export type PollingStationSubmit = (electionId: number, obj: POLLING_STATION_CREATE_REQUEST_BODY) => void;

export type UsePollingStationMutationReturn = {
  create: PollingStationSubmit;

  loading: boolean;
  error: string | null;
  data: PollingStation | null;
};

export function usePollingStationCreate(): UsePollingStationMutationReturn {
  const api = useApi();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<PollingStation | null>(null);

  const create: PollingStationSubmit = React.useCallback(
    (obj, electionId) => {
      void (async (electionId: number, obj: PollingStationRequest) => {
        setLoading(true);
        const path: POLLING_STATION_CREATE_REQUEST_PATH = `/api/elections/${electionId}/polling_stations`;

        const response = await api.postRequest<PollingStation>(path, obj);

        if (response instanceof ApiError || response instanceof NetworkError) {
          setError(response.message);
        } else {
          setData(response.data);
        }

        setLoading(false);
      })(obj, electionId);
    },
    [api],
  );

  return { create, loading, error, data };
}
