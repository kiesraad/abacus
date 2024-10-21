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
  status: ApiResponseStatus.ClientError | ApiResponseStatus.ServerError;
  code: number;
  error?: string;

  constructor(status: ApiResponseStatus.ClientError | ApiResponseStatus.ServerError, code: number, error?: string) {
    super(error);
    this.status = status;
    this.code = code;
    this.error = error;
  }

  withContext(message: string): this {
    this.error = message;

    return this;
  }
}

export class ApiClient {
  async responseHandler<T>(response: Response): Promise<ApiResult<T>> {
    let body;
    if (response.headers.get("Content-Type") === "application/json") {
      try {
        body = (await response.json()) as T | ApiError;
      } catch (e) {
        console.error("Failed to parse json", e);
        return new ApiError(
          ApiResponseStatus.ServerError,
          response.status,
          `Server response parse error: ${response.status}`,
        );
      }
    } else {
      body = await response.text();
      if (body.length > 0) {
        console.error("Unexpected data from server:", body);
        return new ApiError(ApiResponseStatus.ServerError, response.status, `Unexpected data from server: ${body}`);
      }
    }

    let status;
    if (response.status >= 200 && response.status <= 299) {
      status = ApiResponseStatus.Success;
    } else if (response.status >= 400 && response.status <= 499) {
      status = ApiResponseStatus.ClientError;
    } else if (response.status >= 500 && response.status <= 599) {
      status = ApiResponseStatus.ServerError;
    } else {
      return new ApiError(
        ApiResponseStatus.ServerError,
        response.status,
        `Unexpected response status: ${response.status}`,
      );
    }

    if (status === ApiResponseStatus.Success) {
      return {
        status,
        code: response.status,
        data: body as T,
      };
    } else {
      return new ApiError(status, response.status, (body as ApiError).error);
    }
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
