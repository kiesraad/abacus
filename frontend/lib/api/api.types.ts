import type { ApiError, FatalApiError, NetworkError, NotFoundError } from "./ApiError";
import type { ApiResponseStatus } from "./ApiResponseStatus";

export type AnyApiError = ApiError | FatalApiError | NetworkError | NotFoundError;

export type ApiResult<T, E = AnyApiError> = ApiResponse<T> | E;

export interface ServerError {
  error: string;
}

export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiResponse<T> {
  status: ApiResponseStatus.Success;
  code: number;
  data: T;
}
