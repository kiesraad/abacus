import * as React from "react";

import { ApiError, ApiResponseStatus } from "./ApiClient";
import { useApi } from "./useApi";

export type UseApiGetRequestReturn<T> = {
  loading: boolean;
  error: ApiError | null;
  data: T | null;
};

export interface UseApiGetRequestParams {
  path: string;
}

export function useApiGetRequest<T>(path: string): UseApiGetRequestReturn<T> {
  const { client } = useApi();
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);

  React.useEffect(() => {
    let isSubscribed = true;
    const doRequest = async (path: string) => {
      if (isSubscribed) {
        const response = await client.getRequest<T>(path);
        if (response.status === ApiResponseStatus.Success) {
          setData(response.data);
        } else {
          setError(response);
        }
      }
    };

    if (path !== "") {
      doRequest(path).catch((e: unknown) => {
        console.error("Error", e);
      });
    }

    return () => {
      isSubscribed = false;
    };
  }, [client, path]);

  const loading = React.useMemo(() => data === null && error === null, [data, error]);

  return {
    loading,
    error,
    data,
  };
}
