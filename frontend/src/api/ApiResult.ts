import { TranslationPath } from "@/i18n/i18n.types";
import { ErrorReference } from "@/types/generated/openapi";

export class FatalError extends Error {}

export enum ApiResponseStatus {
  Success,
  ClientError,
  ServerError,
}

// Error that should allow the user to retry the request
export class ApiError extends Error {
  constructor(
    public status: ApiResponseStatus.ClientError | ApiResponseStatus.ServerError,
    public code: number,
    public message = "Unknown error",
    // Error reference used to show the corresponding error message to the end-user
    public reference: ErrorReference = "InternalServerError",
  ) {
    super(message);
  }
}

// Error that should not allow the user to retry the request
export class FatalApiError extends FatalError {
  constructor(
    public status: ApiResponseStatus.ClientError | ApiResponseStatus.ServerError,
    public code: number,
    public message = "Unknown error",
    public reference: ErrorReference = "InternalServerError",
  ) {
    super(message);
  }
}

// Problem connecting with the backend
export class NetworkError extends FatalError {
  constructor(public message: string) {
    super(message);
  }
}

// Resource not found
export class NotFoundError extends FatalError {
  path: string;
  message: TranslationPath;
  vars?: Record<string, string | number>;

  constructor(message?: TranslationPath) {
    super(message || "error.not_found");
    this.message = message || "error.not_found";
    this.path = window.location.pathname;
  }

  withMessage(message: TranslationPath, vars?: Record<string, string | number>): this {
    this.message = message;
    this.vars = vars;

    return this;
  }
}

export type AnyApiError = ApiError | FatalApiError | NetworkError | NotFoundError;

export interface ApiResponse<T> {
  status: ApiResponseStatus.Success;
  code: number;
  data: T;
}

export type ApiResult<T, E = AnyApiError> = ApiResponse<T> | E;

export function isError<T>(result: ApiResult<T>): result is Error {
  return (
    result instanceof ApiError ||
    result instanceof FatalApiError ||
    result instanceof NotFoundError ||
    result instanceof NetworkError
  );
}

export function isSuccess<T>(result: ApiResult<T>): result is ApiResponse<T> {
  return !(
    result instanceof ApiError ||
    result instanceof FatalApiError ||
    result instanceof NotFoundError ||
    result instanceof NetworkError
  );
}

export function isFatalError(error: ApiResult<unknown>): error is FatalError {
  return error instanceof FatalError;
}
