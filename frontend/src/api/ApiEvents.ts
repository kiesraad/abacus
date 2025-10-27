import { ApiError, FatalApiError } from "./ApiResult";

export class ApiErrorEvent extends Event {
  constructor(public error: ApiError | FatalApiError) {
    super("apiError");
    this.error = error;
  }
}

export class ApiResponseEvent extends Event {
  constructor(public response: Response) {
    super("apiResponse");
    this.response = response;
  }
}

export class SessionExpirationEvent extends Event {
  constructor(public expiration: Date) {
    super("sessionExpiration");
    this.expiration = expiration;
  }
}
