import { useEffect, useState } from "react";

import { ApiRequestState, isFatalRequestState } from "./ApiRequestState";
import { ApiResult } from "./ApiResult";
import { useApiClient } from "./useApiClient";
import { handleApiResult } from "./useInitialApiGet";

export type ApiRequestIdleState = {
  status: "idle";
};

export interface UseCrudReturn<T> {
  get: (controller?: AbortController) => Promise<ApiResult<T>>;
  create: (requestBody: object, controller?: AbortController) => Promise<ApiResult<T>>;
  update: (requestBody: object, controller?: AbortController) => Promise<ApiResult<T>>;
  remove: (controller?: AbortController) => Promise<ApiResult<T>>;
  requestState: ApiRequestIdleState | ApiRequestState<T>;
}

export type ApiPaths =
  | string
  | {
      get?: string;
      create?: string;
      update?: string;
      remove?: string;
    };

// Call the api and return the current status of the request, optionally throws an error when the request fails
export function useCrud<T>(path: ApiPaths): UseCrudReturn<T> {
  const client = useApiClient();
  const [requestState, setRequestState] = useState<ApiRequestIdleState | ApiRequestState<T>>({ status: "idle" });
  const paths = typeof path === "string" ? { get: path, create: path, update: path, remove: path } : path;

  // throw fatal errors
  useEffect(() => {
    if ("error" in requestState && isFatalRequestState(requestState)) {
      throw requestState.error;
    }
  }, [requestState]);

  // Get a resource
  const get = async (controller?: AbortController) => {
    if (!paths.get) {
      throw new Error("No get path provided for get request");
    }

    setRequestState({ status: "loading" });
    const result = await client.getRequest<T>(paths.get, controller);

    return handleApiResult(result, setRequestState, controller);
  };

  // Create a new resource
  const create = async (requestBody: object, controller?: AbortController) => {
    if (!paths.create) {
      throw new Error("No get path provided for create request");
    }

    setRequestState({ status: "loading" });
    const result = await client.postRequest<T>(paths.create, requestBody, controller);

    return handleApiResult(result, setRequestState, controller);
  };

  // Update an existing resource
  const update = async (requestBody: object, controller?: AbortController) => {
    if (!paths.update) {
      throw new Error("No get path provided for update request");
    }

    setRequestState({ status: "loading" });
    const result = await client.putRequest<T>(paths.update, requestBody, controller);

    return handleApiResult(result, setRequestState, controller);
  };

  // Remove an existing resource
  const remove = async (controller?: AbortController) => {
    if (!paths.remove) {
      throw new Error("No get path provided for remove request");
    }

    setRequestState({ status: "loading" });
    const result = await client.deleteRequest<T>(paths.remove, controller);

    return handleApiResult(result, setRequestState, controller);
  };

  return {
    get,
    create,
    update,
    remove,
    requestState,
  };
}
