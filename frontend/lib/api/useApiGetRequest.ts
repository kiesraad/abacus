import * as React from "react";

import { ApiError, ApiResponseStatus } from "./ApiClient";
import { useApi } from "./useApi";

export type UseApiGetRequestReturn<T> = {
  loading: boolean;
  error: ApiError | null;
  data: T | null;
  refetch: () => void;
};

export interface UseApiGetRequestParams {
  path: string;
}

export function useApiGetRequest<T>(path: string): UseApiGetRequestReturn<T> {
  const { client } = useApi();
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(() => {
    let isSubscribed = true;
    setLoading(true);
    client
      .getRequest<T>(path)
      .then((response) => {
        if (isSubscribed) {
          if (response.status === ApiResponseStatus.Success) {
            setData(response.data);
            setError(null);
            setLoading(false);
          } else {
            setLoading(false);
            setError(response);
          }
        }
      })
      .catch((e: unknown) => {
        setLoading(false);
        if (isSubscribed) {
          console.error("GET API error", e);
        }
      });
    return () => {
      isSubscribed = false;
    };
  }, [client, path]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    loading,
    error,
    data,
    refetch: fetchData,
  };
}
