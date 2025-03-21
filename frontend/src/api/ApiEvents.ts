import { ApiError } from "./ApiResult";

export class ApiErrorEvent extends Event {
  constructor(public error: ApiError) {
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
