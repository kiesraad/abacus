import * as React from "react";

import { useApi } from "./useApi";
import { ApiResponseErrorData } from "./ApiClient";

export type UseApiGetRequestReturn<DATA> = {
  loading: boolean;
  error: ApiResponseErrorData | null;
  data: DATA | null;
};

export interface UseApiGetRequestParams {
  path: string;
}

export function useApiGetRequest<DATA>({
  path,
}: UseApiGetRequestParams): UseApiGetRequestReturn<DATA> {
  const { client } = useApi();
  const [data, setData] = React.useState<DATA | null>(null);
  const [error, setError] = React.useState<ApiResponseErrorData | null>(null);

  React.useEffect(() => {
    let isSubscribed = true;

    const doRequest = async (path: string) => {
      console.log(path);
      console.log(isSubscribed);
      const response = await client.getRequest<DATA>(path);
      console.log("response");
      console.log(response);
      console.log(isSubscribed);
      if (isSubscribed) {
        console.log("isSubscribed");
        if (response.status === "success") {
          console.log("success");
          setData(response.data as DATA);
          console.log(data);
        } else {
          setError(response.data as ApiResponseErrorData);
        }
      }
    };

    doRequest(path).catch((e: unknown) => {
      console.log("catch");
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
