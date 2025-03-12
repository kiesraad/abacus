import { useCallback, useEffect, useState } from "react";

import { DEFAULT_CANCEL_REASON } from "./ApiClient";
import {
  ApiRequestState,
  ApiRequestStateWithoutFatalErrors,
  fromApiResult,
  isFatalRequestState,
} from "./ApiRequestState";
import { ApiResult } from "./ApiResult";
import { useApiClient } from "./useApiClient";

export interface UseApiRequestReturn<T> {
  requestState: ApiRequestState<T>;
  refetch: (controller?: AbortController) => Promise<ApiResult<T>>;
}

export interface UseApiRequestReturnWithoutFatalErrors<T> extends UseApiRequestReturn<T> {
  requestState: ApiRequestStateWithoutFatalErrors<T>;
}

// Update request state or throw an error based on the result of an API call
export function handleApiResult<T>(
  result: ApiResult<T>,
  setRequestState: (state: ApiRequestState<T>) => void,
  controller?: AbortController,
): ApiResult<T> {
  // Do not update state if the request was aborted (mainly caused by an unmounted component)
  if (controller instanceof AbortController && controller.signal.aborted) {
    return result;
  }

  setRequestState(fromApiResult(result));

  return result;
}

function useApiRequestInner<T>(path: string, throwFatalErrors: true): UseApiRequestReturnWithoutFatalErrors<T>;
function useApiRequestInner<T>(path: string, throwFatalErrors: false): UseApiRequestReturn<T>;
function useApiRequestInner<T>(
  path: string,
  throwFatalErrors: boolean,
): UseApiRequestReturn<T> | UseApiRequestReturnWithoutFatalErrors<T> {
  const client = useApiClient();
  const [requestState, setRequestState] = useState<ApiRequestState<T>>({ status: "loading" });

  // throw fatal errors
  useEffect(() => {
    if (throwFatalErrors && isFatalRequestState(requestState)) {
      throw requestState.error;
    }
  }, [requestState, throwFatalErrors]);

  // Perform the API request and set the state accordingly
  const refetch = useCallback(
    async (controller?: AbortController): Promise<ApiResult<T>> => {
      const result = await client.getRequest<T>(path, controller);

      return handleApiResult(result, setRequestState, controller);
    },
    [client, path],
  );

  // Fetch the data when the component mounts
  // and cancel the request when the component unmounts
  useEffect(() => {
    const controller = new AbortController();

    void client.getRequest<T>(path, controller).then((result) => {
      void handleApiResult(result, setRequestState, controller);
    });

    return () => {
      controller.abort(DEFAULT_CANCEL_REASON);
    };
  }, [client, path, throwFatalErrors]);

  return {
    requestState,
    refetch,
  };
}

export function useApiRequestWithErrors<T>(path: string): UseApiRequestReturn<T> {
  return useApiRequestInner(path, false);
}

// Call the api and return the current status of the request, optionally throws an error when the request fails
export function useApiRequest<T>(path: string): UseApiRequestReturnWithoutFatalErrors<T> {
  return useApiRequestInner(path, true);
}
