import { type ErrorResponse } from "@kiesraad/api";
import { TranslationPath } from "@kiesraad/i18n";

import { ApiResult, RequestMethod, ServerError } from "./api.types";
import { ApiError, NetworkError, NotFoundError } from "./ApiError";
import { ApiResponseStatus } from "./ApiResponseStatus";

const MIME_JSON = "application/json";
const HEADER_ACCEPT = "Accept";
const HEADER_CONTENT_TYPE = "Content-Type";

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

      if (response.status === 404 && isError) {
        return new NotFoundError(`error.${body.reference}` as TranslationPath);
      }

      if (response.status >= 400 && response.status <= 499 && isError) {
        return new ApiError(ApiResponseStatus.ClientError, response.status, body.error, body.fatal, body.reference);
      }

      if (response.status >= 500 && response.status <= 599 && isError) {
        return new ApiError(ApiResponseStatus.ServerError, response.status, body.error, body.fatal, body.reference);
      }

      return new ApiError(
        ApiResponseStatus.ServerError,
        response.status,
        `Unexpected response status: ${response.status}`,
        true,
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
      return new ApiError(ApiResponseStatus.ClientError, response.status, body, true, "InvalidData");
    }

    if (response.status >= 500 && response.status <= 599) {
      return new ApiError(ApiResponseStatus.ServerError, response.status, body, true, "InvalidData");
    }

    if (body.length > 0) {
      console.error("Unexpected data from server:", body);

      const message = `Unexpected data from server: ${body}`;
      return new ApiError(ApiResponseStatus.ServerError, response.status, message, true, "InvalidData");
    }

    if (response.ok) {
      return {
        status: ApiResponseStatus.Success,
        code: response.status,
        data: body as T,
      };
    }

    return new ApiError(
      ApiResponseStatus.ServerError,
      response.status,
      `Unexpected response status: ${response.status}`,
      true,
      "InvalidData",
    );
  }

  // perform a HTTP request and handle the response
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
      const message = (e as Error).message || "Network error";
      console.error(message);
      return new NetworkError(message);
    }
  }

  // perform a POST request
  async postRequest<T>(path: string, requestBody?: object, abort?: AbortController): Promise<ApiResult<T>> {
    return this.request<T>("POST", path, abort, requestBody);
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
