import { useCallback, useState } from "react";

import { useApi } from "./useApi";
import { ApiRequestState, handleApiResult, LimitedApiRequestState } from "./useApiRequest";

export interface UseCrudReturn<T> {
  get: (path: string, controller?: AbortController) => Promise<void>;
  create: (path: string, requestBody: object, controller?: AbortController) => Promise<void>;
  update: (path: string, requestBody: object, controller?: AbortController) => Promise<void>;
  remove: (path: string, controller?: AbortController) => Promise<void>;
  requestState: ApiRequestState<T>;
}

export interface UseLimitedCrudReturn<T> extends UseCrudReturn<T> {
  requestState: LimitedApiRequestState<T>;
}

// Call the api and return the current status of the request, optionally throws an error when the request fails
export function useCrud<T>(throwErrors: true): UseLimitedCrudReturn<T>;
export function useCrud<T>(throwErrors: false): UseCrudReturn<T>;
export function useCrud<T>(throwErrors: boolean): UseCrudReturn<T> {
  const client = useApi();
  const [requestState, setRequestState] = useState<ApiRequestState<T>>({ status: "loading" });

  // Create a new resource
  const get = useCallback(
    async (path: string, controller?: AbortController) => {
      const result = await client.getRequest<T>(path, controller);

      void handleApiResult(result, setRequestState, throwErrors, controller);
    },
    [client, throwErrors],
  );

  // Create a new resource
  const create = useCallback(
    async (path: string, requestBody: object, controller?: AbortController) => {
      const result = await client.postRequest<T>(path, requestBody, controller);

      void handleApiResult(result, setRequestState, throwErrors, controller);
    },
    [client, throwErrors],
  );

  // Update an existing resource
  const update = useCallback(
    async (path: string, requestBody: object, controller?: AbortController) => {
      const result = await client.putRequest<T>(path, requestBody, controller);

      void handleApiResult(result, setRequestState, throwErrors, controller);
    },
    [client, throwErrors],
  );

  // Remove an existing resource
  const remove = useCallback(
    async (path: string, controller?: AbortController) => {
      const result = await client.deleteRequest<T>(path, controller);

      void handleApiResult(result, setRequestState, throwErrors, controller);
    },
    [client, throwErrors],
  );

  return {
    get,
    create,
    update,
    remove,
    requestState,
  };
}
