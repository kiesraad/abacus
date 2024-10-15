import * as React from "react";

import { useError } from "@kiesraad/state";

import { ApiError, ApiResponseStatus } from "./ApiClient";
import { useApi } from "./useApi";

export type UseApiGetRequestReturn<T> = {
  loading: boolean;
  error: ApiError | null;
  data: T | null;
  refetch: () => void;
};

export function useApiGetRequest<T>(path: string): UseApiGetRequestReturn<T> {
  const { client } = useApi();
  const [data, setData] = React.useState<T | null>(null);
  const [error, setApiError] = React.useState<ApiError | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { clearError, setError } = useError();

  const fetchData = React.useCallback(() => {
    let isSubscribed = true;
    setLoading(true);
    client
      .getRequest<T>(path)
      .then((response) => {
        if (isSubscribed) {
          if (response.status === ApiResponseStatus.Success) {
            setData(response.data);
            setApiError(null);
            setLoading(false);
            clearError();
          } else {
            setLoading(false);
            setApiError(response);
            setError({
              message: "API request failed",
              trace: response.error || "",
            });
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
  }, [client, path, clearError, setError]);

  React.useEffect(fetchData, [fetchData]);

  return {
    loading,
    error,
    data,
    refetch: fetchData,
  };
}
