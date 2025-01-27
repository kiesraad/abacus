import { type ErrorResponse } from "@kiesraad/api";
import { TranslationPath } from "@kiesraad/i18n";

import { ApiResult, RequestMethod, ServerError } from "./api.types";
import { ApiError, FatalApiError, NetworkError, NotFoundError } from "./ApiError";
import { ApiResponseStatus } from "./ApiResponseStatus";

const MIME_JSON = "application/json";
const HEADER_ACCEPT = "Accept";
const HEADER_CONTENT_TYPE = "Content-Type";

export const DEFAULT_CANCEL_REASON = "Component unmounted";

function isErrorResponse(object: unknown): object is ErrorResponse {
  return (
    typeof object === "object" && object !== null && "error" in object && "fatal" in object && "reference" in object
  );
}

/**
 * Abstraction over the browser fetch API to handle JSON responses and errors.
 */
export class ApiClient {
  // encode an optional JSON body
  setRequestBodyAndHeaders(requestBody?: object): RequestInit {
    if (requestBody) {
      return {
        headers: {
          [HEADER_ACCEPT]: MIME_JSON,
          [HEADER_CONTENT_TYPE]: MIME_JSON,
        },
        body: JSON.stringify(requestBody),
      };
    }

    return {
      headers: {
        [HEADER_ACCEPT]: MIME_JSON,
      },
    };
  }

  // handle a response with a JSON body, and return an error when there is a non-2xx status or a non-JSON body
  async handleJsonBody<T>(response: Response): Promise<ApiResult<T>> {
    try {
      const body = (await response.json()) as T | ServerError;

      if (response.ok) {
        return {
          status: ApiResponseStatus.Success,
          code: response.status,
          data: body as T,
        };
      }

      const isError = isErrorResponse(body);

      // NOTE: the reference field references the error we should show to the user,
      // We prefix it by `error.` to namespace the translation message.

      if (response.status === 404 && isError) {
        return new NotFoundError(`error.${body.reference}` as TranslationPath);
      }

      if (response.status >= 400 && response.status <= 499 && isError) {
        if (body.fatal) {
          return new FatalApiError(ApiResponseStatus.ClientError, response.status, body.error, body.reference);
        }

        return new ApiError(ApiResponseStatus.ClientError, response.status, body.error, body.reference);
      }

      if (response.status >= 500 && response.status <= 599 && isError) {
        if (body.fatal) {
          return new FatalApiError(ApiResponseStatus.ServerError, response.status, body.error, body.reference);
        }

        return new ApiError(ApiResponseStatus.ServerError, response.status, body.error, body.reference);
      }

      return new FatalApiError(
        ApiResponseStatus.ServerError,
        response.status,
        `Unexpected response status: ${response.status}`,
        "InvalidData",
      );
    } catch (e) {
      console.error("Error parsing response", e);

      return new NetworkError((e as Error).message || "Network error");
    }
  }

  // handle a response without a body, and return an error when there is a non-2xx status or a non-empty body
  async handleEmptyBody<T>(response: Response): Promise<ApiResult<T>> {
    const body = await response.text();

    if (response.status === 404) {
      return new NotFoundError("error.not_found");
    }

    if (response.status >= 400 && response.status <= 499) {
      return new FatalApiError(ApiResponseStatus.ClientError, response.status, body, "InvalidData");
    }

    if (response.status >= 500 && response.status <= 599) {
      return new FatalApiError(ApiResponseStatus.ServerError, response.status, body, "InternalServerError");
    }

    if (body.length > 0) {
      console.error("Unexpected data from server:", body);

      const message = `Unexpected data from server: ${body}`;
      return new FatalApiError(ApiResponseStatus.ServerError, response.status, message, "InternalServerError");
    }

    if (response.ok) {
      return {
        status: ApiResponseStatus.Success,
        code: response.status,
        data: body as T,
      };
    }

    return new FatalApiError(
      ApiResponseStatus.ServerError,
      response.status,
      `Unexpected response status: ${response.status}`,
      "InvalidData",
    );
  }

  // perform an HTTP request and handle the response
  async request<T>(
    method: RequestMethod,
    path: string,
    abort?: AbortController,
    requestBody?: object,
  ): Promise<ApiResult<T>> {
    try {
      const response = await fetch(path, {
        method,
        signal: abort?.signal,
        ...this.setRequestBodyAndHeaders(requestBody),
      });

      const isJson = response.headers.get(HEADER_CONTENT_TYPE) === MIME_JSON;

      if (isJson) {
        return await this.handleJsonBody<T>(response);
      }

      return await this.handleEmptyBody(response);
    } catch (e: unknown) {
      if (e === DEFAULT_CANCEL_REASON) {
        // ignore cancel by unmounted component
        return new NetworkError(e);
      }

      const message = (e as Error).message || "Network error";
      console.error(e, method, path);
      return new NetworkError(`${message}, ${method} ${path}`);
    }
  }

  // perform a POST request
  async postRequest<RESPONSE>(
    path: string,
    requestBody?: object,
    abort?: AbortController,
  ): Promise<ApiResult<RESPONSE>> {
    return this.request<RESPONSE>("POST", path, abort, requestBody);
  }

  // perform a PUT request
  async putRequest<T>(path: string, requestBody?: object, abort?: AbortController): Promise<ApiResult<T>> {
    return this.request<T>("PUT", path, abort, requestBody);
  }

  // perform a GET request
  async getRequest<T>(path: string, abort?: AbortController): Promise<ApiResult<T>> {
    return this.request<T>("GET", path, abort);
  }

  // perform a DELETE request
  async deleteRequest<T>(path: string, abort?: AbortController): Promise<ApiResult<T>> {
    return this.request<T>("DELETE", path, abort);
  }
}
