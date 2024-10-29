import { ApiResponseStatus } from "./ApiResponseStatus";

export class ApiError extends Error {
  constructor(
    public status: ApiResponseStatus.ClientError | ApiResponseStatus.ServerError,
    public code: number,
    public message = "Unknown error",
  ) {
    super(message);
  }

  withContext(message: string): this {
    this.message = message;

    return this;
  }
}
