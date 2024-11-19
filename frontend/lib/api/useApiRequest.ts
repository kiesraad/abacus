import { useCallback, useEffect, useState } from "react";

import { ApiResult } from "./api.types";
import { DEFAULT_CANCEL_REASON } from "./ApiClient";
import { ApiError, FatalApiError, NetworkError, NotFoundError } from "./ApiError";
import { useApi } from "./useApi";

// Happy path states, possible errors are thrown
export type LimitedApiRequestState<T> =
  | {
      status: "loading";
    }
  | {
      status: "success";
      data: T;
    };

// All possible states, including errors
export type ApiRequestState<T> =
  | LimitedApiRequestState<T>
  | {
      status: "api-error";
      error: ApiError;
    }
  | {
      status: "fatal-api-error";
      error: ApiError;
    }
  | {
      status: "not-found-error";
      error: NotFoundError;
    }
  | {
      status: "network-error";
      error: NetworkError;
    };

export interface UseApiRequestReturn<T> {
  requestState: ApiRequestState<T>;
  refetch: (controller?: AbortController) => Promise<ApiResult<T>>;
}

export interface UseLimitedApiRequestState<T> extends UseApiRequestReturn<T> {
  requestState: LimitedApiRequestState<T>;
}

// Update request state or throw an error based on the result of an API call
export function handleApiResult<T>(
  result: ApiResult<T>,
  setRequestState: (state: ApiRequestState<T>) => void,
  throwErrors: boolean,
  controller?: AbortController,
): ApiResult<T> {
  // Do not update state if the request was aborted (mainly caused by a unmounted component)
  if (controller instanceof AbortController && controller.signal.aborted) {
    return result;
  }

  if (throwErrors) {
    if (
      result instanceof ApiError ||
      result instanceof FatalApiError ||
      result instanceof NetworkError ||
      result instanceof NotFoundError
    ) {
      throw result;
    }
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

// Call the api and return the current status of the request, optionally throws an error when the request fails
export function useApiRequest<T>(path: string, throwErrors: true): UseLimitedApiRequestState<T>;
export function useApiRequest<T>(path: string, throwErrors: false): UseApiRequestReturn<T>;
export function useApiRequest<T>(path: string, throwErrors: boolean): UseApiRequestReturn<T> {
  const client = useApi();
  const [requestState, setRequestState] = useState<ApiRequestState<T>>({ status: "loading" });

  // Perform the API request and set the state accordingly
  const fetchData = useCallback(
    async (controller?: AbortController): Promise<ApiResult<T>> => {
      const result = await client.getRequest<T>(path, controller);

      if (controller instanceof AbortController && controller.signal.aborted) {
        return result;
      }

      return handleApiResult(result, setRequestState, throwErrors);
    },
    [client, path, throwErrors],
  );

  // Fetch the data when the component mounts
  // and cancel the request when the component unmounts
  useEffect(() => {
    const controller = new AbortController();

    void fetchData(controller);

    return () => {
      controller.abort(DEFAULT_CANCEL_REASON);
    };
  }, [fetchData]);

  return {
    requestState,
    refetch: fetchData,
  };
}
