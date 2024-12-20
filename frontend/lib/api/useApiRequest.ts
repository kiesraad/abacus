import { useCallback, useEffect, useState } from "react";

import { ApiResult } from "./api.types";
import { DEFAULT_CANCEL_REASON } from "./ApiClient";
import { ApiError, FatalApiError, NetworkError, NotFoundError } from "./ApiError";
import { useApi } from "./useApi";
import { CrudRequestState } from "./useCrud";

// Happy path states, possible errors are thrown
export type ApiRequestStateWithoutFatalErrors<T> =
  | {
      status: "loading";
    }
  | {
      status: "success";
      data: T;
    }
  | {
      status: "api-error";
      error: ApiError;
    };

export type ApiRequestFatalErrorState =
  | {
      status: "fatal-api-error";
      error: FatalApiError;
    }
  | {
      status: "not-found-error";
      error: NotFoundError;
    }
  | {
      status: "network-error";
      error: NetworkError;
    };

// All possible states, including errors
export type ApiRequestState<T> =
  | ApiRequestStateWithoutFatalErrors<T>
  | {
      status: "api-error";
      error: ApiError;
    }
  | ApiRequestFatalErrorState;

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

  if (result instanceof ApiError) {
    setRequestState({ status: "api-error", error: result });
  } else if (result instanceof FatalApiError) {
    setRequestState({ status: "fatal-api-error", error: result });
  } else if (result instanceof NotFoundError) {
    setRequestState({ status: "not-found-error", error: result });
  } else if (result instanceof NetworkError) {
    setRequestState({ status: "network-error", error: result });
  } else {
    setRequestState({ status: "success", data: result.data });
  }

  return result;
}

export function fatalRequestState<T>(
  requestState: ApiRequestState<T> | CrudRequestState<T>,
): requestState is ApiRequestFatalErrorState {
  return (
    requestState.status === "fatal-api-error" ||
    requestState.status === "not-found-error" ||
    requestState.status === "network-error"
  );
}

function useApiRequestInner<T>(path: string, throwErrors: true): UseApiRequestReturnWithoutFatalErrors<T>;
function useApiRequestInner<T>(path: string, throwErrors: false): UseApiRequestReturn<T>;
function useApiRequestInner<T>(
  path: string,
  throwErrors: boolean,
): UseApiRequestReturn<T> | UseApiRequestReturnWithoutFatalErrors<T> {
  const client = useApi();
  const [requestState, setRequestState] = useState<ApiRequestState<T>>({ status: "loading" });

  // throw fatal errors
  useEffect(() => {
    if (throwErrors && fatalRequestState(requestState)) {
      throw requestState.error;
    }
  }, [requestState, throwErrors]);

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
  }, [client, path, throwErrors]);

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
