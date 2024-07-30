import * as React from "react";

import { ApiResponseErrorData } from "./ApiClient";
import { useApi } from "./useApi";

export type UseApiGetRequestReturn<DATA> = {
  loading: boolean;
  error: ApiResponseErrorData | null;
  data: DATA | null;
};

export interface UseApiGetRequestParams {
  path: string;
}

export function useApiGetRequest<DATA>(path: string): UseApiGetRequestReturn<DATA> {
  const { client } = useApi();
  const [data, setData] = React.useState<DATA | null>(null);
  const [error, setError] = React.useState<ApiResponseErrorData | null>(null);

  React.useEffect(() => {
    let isSubscribed = true;
    const doRequest = async (path: string) => {
      if (isSubscribed) {
        const response = await client.getRequest<DATA>(path);
        if (response.status === "success") {
          setData(response.data as DATA);
        } else {
          setError(response.data as ApiResponseErrorData);
        }
      }
    };

    if (path !== "") {
      doRequest(path).catch((e: unknown) => {
        console.log("Error", e);
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
