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

  withContext(message: string): this {
    this.message = message;

    return this;
  }
}

export class NetworkError extends Error {
  constructor(public message: string) {
    super(message);
  }
}
