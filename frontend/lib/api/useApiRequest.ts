import * as React from "react";

import { useApi } from "./useApi";
import { ApiResponse, ApiResponseSuccess } from "./api";

export type UseApiRequestReturn<REQUEST_BODY, DATA, ERROR> = [
  (requestBody: REQUEST_BODY) => void,
  {
    loading: boolean;
    error: ERROR | null;
    data: DATA | null;
  },
];

export interface UseApiRequestParams<DATA, ERROR> {
  path: string;
  responseHandler: (response: Response) => Promise<DATA | ERROR>;
}

export function useApiRequest<
  REQUEST_BODY,
  DATA extends ApiResponseSuccess,
  ERROR extends ApiResponse,
>({
  path,
  responseHandler,
}: UseApiRequestParams<DATA, ERROR>): UseApiRequestReturn<
  REQUEST_BODY,
  DATA,
  ERROR
> {
  const { client } = useApi();
  const [data, setData] = React.useState<DATA | null>(null);
  const [error, setError] = React.useState<ERROR | null>(null);
  const [apiRequest, setApiRequest] = React.useState<REQUEST_BODY | null>(null);

  React.useEffect(() => {
    const doRequest = async (b: REQUEST_BODY) => {
      const response = await client.postRequest(path, b as object);

      const result = await responseHandler(response);
      if (result.status === "20x") {
        setData(result as DATA);
      } else {
        setError(result as ERROR);
      }
    };

    if (apiRequest) {
      doRequest(apiRequest).catch((e: unknown) => {
        console.error(e);
      });
    }
  }, [apiRequest, client, path, responseHandler]);

  const makeRequest = React.useCallback((requestBody: REQUEST_BODY) => {
    setApiRequest(requestBody);
  }, []);

  const loading = false;

  return [
    makeRequest,
    {
      loading,
      error,
      data,
    },
  ];
}
