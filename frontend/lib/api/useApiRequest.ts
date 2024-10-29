import { useCallback, useEffect, useState } from "react";

import { ApiResult } from "./api.types";
import { ApiError, NetworkError } from "./ApiError";
import { useApi } from "./useApi";

export type ApiRequestState<T> =
  | {
      status: "loading";
    }
  | {
      status: "api-error";
      error: ApiError;
    }
  | {
      status: "network-error";
      error: NetworkError;
    }
  | {
      status: "success";
      data: T;
    };

export type UseApiRequestReturn<T> = {
  state: ApiRequestState<T>;
  refetch: (controller?: AbortController) => Promise<ApiResult<T>>;
};

export function useApiRequest<T>(path: string): UseApiRequestReturn<T> {
  const client = useApi();
  const [state, setState] = useState<ApiRequestState<T>>({ status: "loading" });

  const fetchData = useCallback(
    async (controller?: AbortController): Promise<ApiResult<T>> => {
      const result = await client.getRequest<T>(path, controller);

      if (controller instanceof AbortController && controller.signal.aborted) {
        return result;
      }

      if (result instanceof ApiError) {
        setState({ status: "api-error", error: result });
      } else if (result instanceof NetworkError) {
        setState({ status: "network-error", error: result });
      } else {
        setState({ status: "success", data: result.data });
      }

      return result;
    },
    [client, path],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchData(controller).catch((e: unknown) => {
      throw e;
    });

    return () => {
      controller.abort();
    };
  }, [fetchData]);

  return {
    state,
    refetch: fetchData,
  };
}
