import { ApiError, FatalApiError } from "./ApiResult";

export class ApiErrorEvent extends Event {
  constructor(public error: ApiError | FatalApiError) {
    super("apiError");
    this.error = error;
  }
}

export class SessionExpirationEvent extends Event {
  constructor(public expiration: Date) {
    super("sessionExpiration");
    this.expiration = expiration;
  }
}
