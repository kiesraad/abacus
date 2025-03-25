import { ApiError, ApiResult, FatalApiError, NetworkError, NotFoundError } from "./ApiResult";

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
export type ApiRequestState<T> = ApiRequestStateWithoutFatalErrors<T> | ApiRequestFatalErrorState;

export function isFatalRequestState<T>(requestState: ApiRequestState<T>): requestState is ApiRequestFatalErrorState {
  return (
    requestState.status === "fatal-api-error" ||
    requestState.status === "not-found-error" ||
    requestState.status === "network-error"
  );
}

export function fromApiResult<T>(result: ApiResult<T>): ApiRequestState<T> {
  if (result instanceof ApiError) {
    return { status: "api-error", error: result };
  } else if (result instanceof FatalApiError) {
    return { status: "fatal-api-error", error: result };
  } else if (result instanceof NotFoundError) {
    return { status: "not-found-error", error: result };
  } else if (result instanceof NetworkError) {
    return { status: "network-error", error: result };
  } else {
    return { status: "success", data: result.data };
  }
}
