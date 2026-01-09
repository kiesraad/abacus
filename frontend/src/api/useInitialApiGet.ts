import { useCallback, useEffect, useState } from "react";

import { DEFAULT_CANCEL_REASON } from "./ApiClient";
import {
  type ApiRequestState,
  type ApiRequestStateWithoutFatalErrors,
  fromApiResult,
  isFatalRequestState,
} from "./ApiRequestState";
import { AbortedError, type ApiResult } from "./ApiResult";
import { useApiClient } from "./useApiClient";

/// Header to indicate that the session should not be extended, only the existence is checked, not the value
export const DO_NOT_EXTEND_SESSION = { "x-do-not-extend-session": "on-data-refresh" };

export interface UseInitialApiGetReturn<T> {
  requestState: ApiRequestState<T>;
  refetch: (controller?: AbortController) => Promise<ApiResult<T>>;
}

export interface UseInitialApiGetReturnWithoutFatalErrors<T> extends UseInitialApiGetReturn<T> {
  requestState: ApiRequestStateWithoutFatalErrors<T>;
}

// Update request state or throw an error based on the result of an API call
export function handleApiResult<T>(
  result: ApiResult<T>,
  setRequestState: (state: ApiRequestState<T>) => void,
  controller?: AbortController,
): ApiResult<T> {
  // Do not update state if the request was aborted (mainly caused by an unmounted component)
  if ((controller instanceof AbortController && controller.signal.aborted) || result instanceof AbortedError) {
    return new AbortedError();
  }

  setRequestState(fromApiResult(result));

  return result;
}

function useInitialApiGetInner<T>(path: string, throwFatalErrors: true): UseInitialApiGetReturnWithoutFatalErrors<T>;
function useInitialApiGetInner<T>(path: string, throwFatalErrors: false): UseInitialApiGetReturn<T>;
function useInitialApiGetInner<T>(
  path: string,
  throwFatalErrors: boolean,
): UseInitialApiGetReturn<T> | UseInitialApiGetReturnWithoutFatalErrors<T> {
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
      const result = await client.getRequest<T>(path, controller, DO_NOT_EXTEND_SESSION);

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
  }, [client, path]);

  return {
    requestState,
    refetch,
  };
}

// Call the api and return the current status of the request, also returns fatal errors
export function useInitialApiGetWithErrors<T>(path: string): UseInitialApiGetReturn<T> {
  return useInitialApiGetInner(path, false);
}

// Call the api and return the current status of the request, throws fatal errors instead of returning them
export function useInitialApiGet<T>(path: string): UseInitialApiGetReturnWithoutFatalErrors<T> {
  return useInitialApiGetInner(path, true);
}
