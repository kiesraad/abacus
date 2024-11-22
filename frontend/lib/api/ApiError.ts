import { TranslationPath } from "@kiesraad/i18n";

import { ApiResult } from "./api.types";
import { ApiResponseStatus } from "./ApiResponseStatus";
import { ErrorReference } from "./gen/openapi";

export class FatalError extends Error {}

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

  constructor(message?: TranslationPath) {
    super(message || "error.not_found");
    this.message = message || "error.not_found";
    this.path = window.location.pathname;
  }

  withMessage(message: TranslationPath): this {
    this.message = message;

    return this;
  }
}

export function isFatalError(error: ApiResult<unknown>): error is FatalError {
  return error instanceof FatalError;
}
