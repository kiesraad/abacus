export type ApiResult<T> = ApiResponse<T> | ApiError;

export enum ApiResponseStatus {
  Success,
  ClientError,
  ServerError,
}

export interface ApiResponse<T> {
  status: ApiResponseStatus.Success;
  code: number;
  data: T;
}

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

interface ServerError {
  error: string;
}

export class ApiClient {
  async responseHandler<T>(response: Response): Promise<ApiResult<T>> {
    if (response.headers.get("Content-Type") === "application/json") {
      try {
        const body = (await response.json()) as T | ServerError;

        if (response.status >= 200 && response.status <= 299) {
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
        console.error("Failed to parse json", e);

        return new ApiError(
          ApiResponseStatus.ServerError,
          response.status,
          `Server response parse error: ${response.status}`,
        );
      }
    }

    const body = await response.text();

    if (body.length > 0) {
      const message = `Unexpected data from server: ${body}`;
      console.error("Unexpected data from server:", body);
      return new ApiError(ApiResponseStatus.ServerError, response.status, message);
    }

    if (response.status >= 200 && response.status <= 299) {
      return {
        status: ApiResponseStatus.Success,
        code: response.status,
        data: body as T,
      };
    }

    if (response.status >= 400 && response.status <= 499) {
      return new ApiError(ApiResponseStatus.ClientError, response.status, body);
    }

    if (response.status >= 500 && response.status <= 599) {
      return new ApiError(ApiResponseStatus.ServerError, response.status, body);
    }

    return new ApiError(
      ApiResponseStatus.ServerError,
      response.status,
      `Unexpected response status: ${response.status}`,
    );
  }

  async postRequest<T>(path: string, requestBody?: object): Promise<ApiResult<T>> {
    let requestInit: RequestInit = {
      method: "POST",
    };
    if (requestBody) {
      requestInit = {
        ...requestInit,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      };
    }
    const response = await fetch(path, requestInit);

    return this.responseHandler<T>(response);
  }

  async getRequest<T>(path: string): Promise<ApiResult<T>> {
    const response = await fetch(path, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.responseHandler<T>(response);
  }

  async deleteRequest<T>(path: string): Promise<ApiResult<T>> {
    const response = await fetch(path, { method: "DELETE" });
    return this.responseHandler<T>(response);
  }
}
