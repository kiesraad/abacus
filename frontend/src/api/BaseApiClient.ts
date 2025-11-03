import { ErrorResponse } from "@/types/generated/openapi";

import { ApiErrorEvent, ApiResponseEvent } from "./ApiEvents";
import {
  AbortedError,
  ApiError,
  ApiResponseStatus,
  ApiResult,
  FatalApiError,
  NetworkError,
  NotFoundError,
} from "./ApiResult";

const MIME_JSON = "application/json";
const HEADER_ACCEPT = "Accept";
const HEADER_CONTENT_TYPE = "Content-Type";

function isErrorResponse(object: unknown): object is ErrorResponse {
  return (
    typeof object === "object" && object !== null && "error" in object && "fatal" in object && "reference" in object
  );
}

export interface RequestParams {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  callerAbortController?: AbortController;
  requestBody?: object | string;
  additionalHeaders?: Record<string, string>;
  allowEmptyResponse?: boolean;
}

/**
 * Abstraction over the browser fetch API to handle JSON responses and errors.
 */
export class BaseApiClient extends EventTarget {
  // encode an optional JSON body
  setRequestBodyAndHeaders(requestBody?: object | string, additionalHeaders?: Record<string, string>): RequestInit {
    if (requestBody) {
      return {
        headers: {
          ...additionalHeaders,
          [HEADER_ACCEPT]: MIME_JSON,
          [HEADER_CONTENT_TYPE]: MIME_JSON,
        },
        body: JSON.stringify(requestBody),
      };
    }

    return {
      headers: {
        ...additionalHeaders,
        [HEADER_ACCEPT]: MIME_JSON,
      },
    };
  }

  // handle a response with a JSON body, and return an error when there is a non-2xx status or a non-JSON body
  async handleJsonBody<T>(response: Response): Promise<ApiResult<T>> {
    try {
      const body = (await response.json()) as unknown;

      if (response.ok) {
        return {
          status: ApiResponseStatus.Success,
          code: response.status,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
          data: body as T,
        };
      }

      const isError = isErrorResponse(body);

      // NOTE: the reference field references the error we should show to the user,
      // We prefix it by `error.api_error.` to get the translation key.
      if (response.status === 404 && isError) {
        return new NotFoundError(`error.api_error.${body.reference}`);
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

      const message = e instanceof Error ? e.message : "Network error";
      return new NetworkError(message);
    }
  }

  // handle a response without a body, and return an error when there is a non-2xx status or a non-empty body
  async handleEmptyOrNonJsonBody<T>(response: Response): Promise<ApiResult<T>> {
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
  async request<T>({
    method,
    path,
    callerAbortController,
    requestBody,
    additionalHeaders,
  }: RequestParams): Promise<ApiResult<T>> {
    const abortController = callerAbortController ?? new AbortController();

    try {
      const response = await fetch(path, {
        method,
        signal: abortController.signal,
        ...this.setRequestBodyAndHeaders(requestBody, additionalHeaders),
      });

      if (abortController.signal.aborted) {
        return new AbortedError();
      }

      this.dispatchEvent(new ApiResponseEvent(response));

      const isJson = response.headers.get(HEADER_CONTENT_TYPE) === MIME_JSON;

      // handle the response, and return an error when state there is a non-2xx status
      const apiResult: ApiResult<T> = isJson
        ? await this.handleJsonBody<T>(response)
        : await this.handleEmptyOrNonJsonBody(response);

      // dispatch error events to subscribers
      if (apiResult instanceof ApiError || apiResult instanceof FatalApiError) {
        this.dispatchEvent(new ApiErrorEvent(apiResult));
      }

      return apiResult;
    } catch (e: unknown) {
      if (abortController.signal.aborted) {
        return new AbortedError();
      }

      const message = e instanceof Error ? e.message : "Network error";
      console.error(e, method, path);
      return new NetworkError(`${message}, ${method} ${path}`);
    }
  }
}
