import { ApiResult, RequestMethod, ServerError } from "./api.types";
import { ApiError } from "./ApiError";
import { ApiResponseStatus } from "./ApiResponseStatus";

const MIME_JSON = "application/json";
const HEADER_ACCEPT = "Accept";
const HEADER_CONTENT_TYPE = "Content-Type";

/**
 * Abstraction over the browser fetch API to handle JSON responses and errors.
 */
export class ApiClient {
  // encode an optional JSON body
  encodeBody(requestBody?: object): RequestInit {
    if (requestBody) {
      return {
        headers: {
          [HEADER_ACCEPT]: MIME_JSON,
          [HEADER_CONTENT_TYPE]: MIME_JSON,
        },
        body: JSON.stringify(requestBody),
      };
    }

    return {};
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

      const isError = typeof body === "object" && null !== body && "error" in body;

      if (response.status >= 400 && response.status <= 499 && isError) {
        return new ApiError(ApiResponseStatus.ClientError, response.status, body.error);
      }

      if (response.status >= 500 && response.status <= 599 && isError) {
        return new ApiError(ApiResponseStatus.ServerError, response.status, body.error);
      }

      return new ApiError(
        ApiResponseStatus.ServerError,
        response.status,
        `Unexpected response status: ${response.status}`,
      );
    } catch (e) {
      console.error("Error parsing response", e);

      return new ApiError(
        ApiResponseStatus.ServerError,
        response.status,
        `Server response parse error: ${response.status}`,
      );
    }
  }

  // handle a response without a body, and return an error when there is a non-2xx status or a non-empty body
  async handleEmptyBody<T>(response: Response): Promise<ApiResult<T>> {
    const body = await response.text();

    if (response.status >= 400 && response.status <= 499) {
      return new ApiError(ApiResponseStatus.ClientError, response.status, body);
    }

    if (response.status >= 500 && response.status <= 599) {
      return new ApiError(ApiResponseStatus.ServerError, response.status, body);
    }

    if (body.length > 0) {
      const message = `Unexpected data from server: ${body}`;
      return new ApiError(ApiResponseStatus.ServerError, response.status, message);
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
    );
  }

  // perform a HTTP request and handle the response
  async request<T>(method: RequestMethod, path: string, requestBody?: object): Promise<ApiResult<T>> {
    const response = await fetch(path, {
      method,
      headers: {
        Accept: "application/json",
      },
      ...this.encodeBody(requestBody),
    });

    const isJson = response.headers.get("Content-Type") === "application/json";

    if (isJson) {
      return this.handleJsonBody<T>(response);
    }

    return this.handleEmptyBody(response);
  }

  // perform a POST request
  async postRequest<T>(path: string, requestBody?: object): Promise<ApiResult<T>> {
    return this.request<T>("POST", path, requestBody);
  }

  // perform a GET request
  async getRequest<T>(path: string): Promise<ApiResult<T>> {
    return this.request<T>("GET", path);
  }

  // perform a DELETE request
  async deleteRequest<T>(path: string): Promise<ApiResult<T>> {
    return this.request<T>("DELETE", path);
  }
}
