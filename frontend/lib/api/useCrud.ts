import { useEffect, useState } from "react";

import { useApi } from "./useApi";
import {
  ApiRequestState,
  ApiRequestStateWithoutFatalErrors,
  fatalRequestState,
  handleApiResult,
} from "./useApiRequest";

export type CrudRequestState<T> =
  | {
      status: "idle";
    }
  | ApiRequestState<T>;

export interface UseCrudReturn<T> {
  get: (controller?: AbortController) => Promise<void>;
  create: (requestBody: object, controller?: AbortController) => Promise<void>;
  update: (requestBody: object, controller?: AbortController) => Promise<void>;
  remove: (controller?: AbortController) => Promise<void>;
  requestState: CrudRequestState<T>;
}

export interface UseLimitedCrudReturn<T> extends UseCrudReturn<T> {
  requestState: ApiRequestStateWithoutFatalErrors<T>;
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
export function useCrud<T>(path: ApiPaths, onSaved?: (data: T) => void): UseCrudReturn<T> {
  const client = useApi();
  const [requestState, setRequestState] = useState<CrudRequestState<T>>({ status: "idle" });
  const paths = typeof path === "string" ? { get: path, create: path, update: path, remove: path } : path;

  // throw fatal errors
  useEffect(() => {
    if (fatalRequestState(requestState)) {
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

    void handleApiResult(result, setRequestState, controller, onSaved);
  };

  // Create a new resource
  const create = async (requestBody: object, controller?: AbortController) => {
    if (!paths.create) {
      throw new Error("No get path provided for create request");
    }

    setRequestState({ status: "loading" });
    const result = await client.postRequest<T>(paths.create, requestBody, controller);

    void handleApiResult(result, setRequestState, controller, onSaved);
  };

  // Update an existing resource
  const update = async (requestBody: object, controller?: AbortController) => {
    if (!paths.update) {
      throw new Error("No get path provided for update request");
    }

    setRequestState({ status: "loading" });
    const result = await client.putRequest<T>(paths.update, requestBody, controller);

    void handleApiResult(result, setRequestState, controller, onSaved);
  };

  // Remove an existing resource
  const remove = async (controller?: AbortController) => {
    if (!paths.remove) {
      throw new Error("No get path provided for remove request");
    }

    setRequestState({ status: "loading" });
    const result = await client.deleteRequest<T>(paths.remove, controller);

    void handleApiResult(result, setRequestState, controller, onSaved);
  };

  return {
    get,
    create,
    update,
    remove,
    requestState,
  };
}
