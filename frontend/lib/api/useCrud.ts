import { useCallback, useState } from "react";

import { ApiResult } from "./api.types";
import { useApi } from "./useApi";
import { ApiRequestState, handleApiResult, LimitedApiRequestState } from "./useApiRequest";

export interface UseCrudReturn<T> {
  create: (path: string, requestBody: object, controller?: AbortController) => Promise<ApiResult<T>>;
  update: (path: string, requestBody: object, controller?: AbortController) => Promise<ApiResult<T>>;
  remove: (path: string, controller?: AbortController) => Promise<ApiResult<T>>;
  requestState: ApiRequestState<T>;
}

export interface UseLimitedCrudState<T> extends UseCrudReturn<T> {
  requestState: LimitedApiRequestState<T>;
}

// Call the api and return the current status of the request, optionally throws an error when the request fails
export function useCrud<T>(throwErrors: true): UseLimitedCrudState<T>;
export function useCrud<T>(throwErrors: false): UseCrudReturn<T>;
export function useCrud<T>(throwErrors: boolean): UseCrudReturn<T> {
  const client = useApi();
  const [requestState, setRequestState] = useState<ApiRequestState<T>>({ status: "loading" });

  // Create a new resource
  const create = useCallback(
    async (path: string, requestBody: object, controller?: AbortController): Promise<ApiResult<T>> => {
      const result = await client.postRequest<T>(path, requestBody, controller);

      return handleApiResult(result, setRequestState, throwErrors, controller);
    },
    [client, throwErrors],
  );

  // Update an existing resource
  const update = useCallback(
    async (path: string, requestBody: object, controller?: AbortController): Promise<ApiResult<T>> => {
      const result = await client.putRequest<T>(path, requestBody, controller);

      return handleApiResult(result, setRequestState, throwErrors, controller);
    },
    [client, throwErrors],
  );

  // Remove an existing resource
  const remove = useCallback(
    async (path: string, controller?: AbortController): Promise<ApiResult<T>> => {
      const result = await client.deleteRequest<T>(path, controller);

      return handleApiResult(result, setRequestState, throwErrors, controller);
    },
    [client, throwErrors],
  );

  return {
    create,
    update,
    remove,
    requestState,
  };
}
