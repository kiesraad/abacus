import * as React from "react";

import { useApi } from "./useApi";
import { ApiResponseErrorData } from "./ApiClient";

export type UseApiPostRequestReturn<REQUEST_BODY, DATA> = [
  (requestBody: REQUEST_BODY) => void,
  {
    loading: boolean;
    error: ApiResponseErrorData | null;
    data: DATA | null;
  },
];

export interface UseApiRequestParams {
  path: string;
}

export function useApiPostRequest<REQUEST_BODY, DATA>({
  path,
}: UseApiRequestParams): UseApiPostRequestReturn<REQUEST_BODY, DATA> {
  const { client } = useApi();
  const [data, setData] = React.useState<DATA | null>(null);
  const [error, setError] = React.useState<ApiResponseErrorData | null>(null);
  const [apiRequest, setApiRequest] = React.useState<REQUEST_BODY | null>(null);

  React.useEffect(() => {
    let isSubscribed = true;
    const doRequest = async (b: REQUEST_BODY) => {
      const response = await client.postRequest<DATA>(path, b as object);
      if (isSubscribed) {
        if (response.status === "success") {
          setData(response.data as DATA);
        } else {
          setError(response.data as ApiResponseErrorData);
        }
      }
    };

    if (apiRequest) {
      doRequest(apiRequest).catch((e: unknown) => {
        console.error(e);
      });
    }

    return () => {
      isSubscribed = false;
    };
  }, [apiRequest, client, path]);

  const makeRequest = React.useCallback((requestBody: REQUEST_BODY) => {
    setApiRequest(requestBody);
  }, []);

  const loading = React.useMemo(
    () => apiRequest !== null && data === null && error === null,
    [apiRequest, data, error],
  );

  return [
    makeRequest,
    {
      loading,
      error,
      data,
    },
  ];
}
