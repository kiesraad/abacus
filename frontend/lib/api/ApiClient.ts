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

export type ApiError = {
  status: ApiResponseStatus.ClientError | ApiResponseStatus.ServerError;
  code: number;
  error?: string;
};

export class ApiClient {
  host: string;

  constructor(host: string) {
    this.host = host;
  }

  async responseHandler<T>(response: Response): Promise<ApiResult<T>> {
    let body;
    if (response.headers.get("Content-Type") === "application/json") {
      try {
        body = (await response.json()) as T | ApiError;
      } catch (err: unknown) {
        console.error("Server response parse error:", err);
        throw new Error(`Server response parse error: ${response.status}`);
      }
    } else {
      body = await response.text();
      if (body.length > 0) {
        console.error("Unexpected data from server:", body);
        throw new Error(`Unexpected data from server: ${body}`);
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
      throw new Error(`Unexpected response status: ${response.status}`);
    }

    if (status === ApiResponseStatus.Success) {
      return {
        status,
        code: response.status,
        data: body as T,
      };
    } else {
      return {
        status,
        code: response.status,
        error: (body as ApiError).error,
      };
    }
  }

  async postRequest<T>(path: string, requestBody?: object): Promise<ApiResult<T>> {
    const host = process.env.NODE_ENV === "test" ? "http://testhost" : "";

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
    const response = await fetch(host + path, requestInit);

    return this.responseHandler<T>(response);
  }

  async getRequest<T>(path: string): Promise<ApiResult<T>> {
    const host = process.env.NODE_ENV === "test" ? "http://testhost" : "";

    const response = await fetch(host + path, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.responseHandler<T>(response);
  }

  async deleteRequest<T>(path: string): Promise<ApiResult<T>> {
    const host = process.env.NODE_ENV === "test" ? "http://testhost" : "";
    const response = await fetch(host + path, { method: "DELETE" });
    return this.responseHandler<T>(response);
  }
}
