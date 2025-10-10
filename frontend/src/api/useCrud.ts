import { useState } from "react";

import { ApiRequestState, isFatalRequestState } from "./ApiRequestState";
import { AnyApiError, ApiResult } from "./ApiResult";
import { useApiClient } from "./useApiClient";
import { handleApiResult } from "./useInitialApiGet";

export type ApiRequestIdleState = {
  status: "idle";
};

export interface UseCrudReturn<T> {
  create: (requestBody: object, controller?: AbortController) => Promise<ApiResult<T>>;
  update: (requestBody: object, controller?: AbortController) => Promise<ApiResult<T>>;
  remove: (controller?: AbortController) => Promise<ApiResult<T>>;
  isLoading: boolean;
  error: AnyApiError | null;
}

export type UseCrudOptions = {
  createPath?: string;
  updatePath?: string;
  removePath?: string;
  throwAllErrors?: boolean;
};

// Call the api and return the current status of the request, optionally throws an error when the request fails
export function useCrud<Response>({ throwAllErrors = false, ...paths }: UseCrudOptions): UseCrudReturn<Response> {
  const client = useApiClient();
  const [requestState, setRequestState] = useState<ApiRequestIdleState | ApiRequestState<Response>>({ status: "idle" });

  // throw fatal errors, and optionally all errors
  if ("error" in requestState && (throwAllErrors || isFatalRequestState(requestState))) {
    throw requestState.error;
  }

  // Create a new resource
  const create = async (requestBody: object, controller?: AbortController) => {
    if (!paths.createPath) {
      throw new Error("No create path provided for create request");
    }

    setRequestState({ status: "loading" });
    const result = await client.postRequest<Response>(paths.createPath, requestBody, controller);

    return handleApiResult(result, setRequestState, controller);
  };

  // Update an existing resource
  const update = async (requestBody: object, controller?: AbortController) => {
    if (!paths.updatePath) {
      throw new Error("No update path provided for update request");
    }

    setRequestState({ status: "loading" });
    const result = await client.putRequest<Response>(paths.updatePath, requestBody, controller);

    return handleApiResult(result, setRequestState, controller);
  };

  // Remove an existing resource
  const remove = async (controller?: AbortController) => {
    if (!paths.removePath) {
      throw new Error("No remove path provided for remove request");
    }

    setRequestState({ status: "loading" });
    const result = await client.deleteRequest<Response>(paths.removePath, controller);

    return handleApiResult(result, setRequestState, controller);
  };

  return {
    create,
    update,
    remove,
    isLoading: requestState.status === "loading",
    error: "error" in requestState ? requestState.error : null,
  };
}
