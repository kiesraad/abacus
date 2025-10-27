import { ApiErrorEvent, ApiResponseEvent } from "./ApiEvents";
import { ApiError, ApiResult } from "./ApiResult";
import { BaseApiClient } from "./BaseApiClient";

export const DEFAULT_CANCEL_REASON = "Component unmounted";

/// Header to indicate that the session should not be extended, only the existence is checked, not the value
export const DO_NOT_EXTEND_SESSION = { "x-do-not-extend-session": "on-data-refresh" };

/**
 * Abstraction over the browser fetch API to handle JSON responses and errors.
 */
export class ApiClient extends BaseApiClient {
  // subscribe to API errors
  subscribeToApiErrors(callback: (error: ApiError) => void): () => void {
    const listener = (event: Event) => {
      if (event instanceof ApiErrorEvent) {
        callback(event.error);
      }
    };

    this.addEventListener("apiError", listener);

    // return unsubscribe function
    return () => {
      this.removeEventListener("apiError", listener);
    };
  }

  // subscribe to API header value for session expiration timestamps
  subscribeToSessionExpiration(callback: (expiration: Date) => void): () => void {
    const listener = (event: Event) => {
      if (event instanceof ApiResponseEvent) {
        const sessionExpiration = event.response.headers.get("x-session-expires-at");
        if (sessionExpiration) {
          callback(new Date(sessionExpiration));
        }
      }
    };

    this.addEventListener("apiResponse", listener);

    // return unsubscribe function
    return () => {
      this.removeEventListener("apiResponse", listener);
    };
  }

  // perform a POST request
  async postRequest<T>(
    path: string,
    requestBody?: object | string,
    callerAbortController?: AbortController,
  ): Promise<ApiResult<T>> {
    return this.request<T>({
      method: "POST",
      path,
      callerAbortController,
      requestBody,
    });
  }

  // perform a PUT request
  async putRequest<T>(
    path: string,
    requestBody?: object,
    callerAbortController?: AbortController,
  ): Promise<ApiResult<T>> {
    return this.request<T>({
      method: "PUT",
      path,
      callerAbortController,
      requestBody,
    });
  }

  // perform a GET request, no empty responses are allowed
  async getRequest<T>(
    path: string,
    callerAbortController?: AbortController,
    additionalHeaders?: Record<string, string>,
  ): Promise<ApiResult<T>> {
    return this.request<T>({
      method: "GET",
      path,
      callerAbortController,
      additionalHeaders,
    });
  }

  // perform a DELETE request
  async deleteRequest<T>(path: string, callerAbortController?: AbortController): Promise<ApiResult<T>> {
    return this.request<T>({
      method: "DELETE",
      path,
      callerAbortController,
    });
  }
}
