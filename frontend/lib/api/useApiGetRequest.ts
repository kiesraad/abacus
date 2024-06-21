import * as React from "react";

import { useApi } from "./useApi";
import { ApiResponseErrorData } from "./ApiClient";

export type UseApiGetReturn<DATA> = {
  loading: boolean;
  error: ApiResponseErrorData | null;
  data: DATA | null;
};

export interface UseApiGetRequestParams {
  path: string;
}

export function useApiGetRequest<DATA>({ path }: UseApiGetRequestParams): UseApiGetReturn<DATA> {
  const { client } = useApi();
  const [data, setData] = React.useState<DATA | null>(null);
  const [error, setError] = React.useState<ApiResponseErrorData | null>(null);

  React.useEffect(() => {
    let isSubscribed = true;
    const doRequest = async (path: string) => {
      const response = await client.getRequest<DATA>(path);
      if (isSubscribed) {
        if (response.status === "success") {
          setData(response.data as DATA);
        } else {
          setError(response.data as ApiResponseErrorData);
        }
      }
    };

    doRequest(path).catch((e: unknown) => {
      console.error(e);
    });

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
