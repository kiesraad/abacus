import { TranslationPath } from "@kiesraad/i18n";

import { ApiResult } from "./api.types";
import { ApiResponseStatus } from "./ApiResponseStatus";
import { ErrorReference } from "./gen/openapi";

export class ApiError extends Error {
  constructor(
    public status: ApiResponseStatus.ClientError | ApiResponseStatus.ServerError,
    public code: number,
    public message = "Unknown error",
    public fatal: boolean = true,
    public reference: ErrorReference = "InternalServerError",
  ) {
    super(message);
  }
}

export class NetworkError extends Error {
  constructor(public message: string) {
    super(message);
  }
}

export class NotFoundError extends Error {
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

export function isFatalError(error: ApiResult<unknown>): error is ApiError | NetworkError | NotFoundError {
  return (error instanceof ApiError && error.fatal) || error instanceof NetworkError || error instanceof NotFoundError;
}
