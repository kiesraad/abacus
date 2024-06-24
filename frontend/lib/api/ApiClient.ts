import { ErrorResponse } from "@kiesraad/api";
export interface ApiResponse<DATA = object> {
  status: string;
  code: number;
  data?: DATA;
}

export interface ApiResponseSuccess<DATA = object> extends ApiResponse<DATA> {
  status: "success";
}

export interface ApiResponseClientError<DATA = object> extends ApiResponse<DATA> {
  status: "client_error";
}

export interface ApiResponseServerError<DATA = object> extends ApiResponse<DATA> {
  status: "server_error";
}

export interface ApiResponseErrorData {
  errorCode: string;
  message: string;
}

export type ApiServerResponse<SuccessResponse> =
  | (Omit<Response, "json"> & {
      status: 200;
      json: () => SuccessResponse | PromiseLike<SuccessResponse>;
    })
  | (Omit<Response, "json"> & {
      status: 422;
      json: () => ErrorResponse | PromiseLike<ErrorResponse>;
    })
  | (Omit<Response, "json"> & {
      status: 404;
      json: () => ErrorResponse | PromiseLike<ErrorResponse>;
    })
  | (Omit<Response, "json"> & {
      status: 500;
      json: () => ErrorResponse | PromiseLike<ErrorResponse>;
    })
  | (Omit<Response, "json"> & {
      status: number;
      json: () => never;
    });

export class ApiClient {
  host: string;

  constructor(host: string) {
    this.host = host;
  }

  async responseHandler<SuccessResponse>(response: Response) {
    const res = response as ApiServerResponse<SuccessResponse>;
    try {
      if (res.status === 200) {
        const data = await res.json();
        return {
          status: "success",
          code: 200,
          data,
        } as ApiResponseSuccess<SuccessResponse>;
      } else if (res.status >= 400 && res.status <= 499) {
        const data = await res.json();
        return {
          status: "client_error",
          code: res.status,
          data,
        } as ApiResponseClientError<ErrorResponse>;
      } else if (res.status >= 500 && res.status <= 599) {
        const data = await res.json();
        return {
          status: "server_error",
          code: res.status,
          data,
        } as ApiResponseServerError<ErrorResponse>;
      }
    } catch (err: unknown) {
      throw new Error(`Server response parse error: ${res.status}`);
    }
    throw new Error(`Unexpected response status: ${res.status}`);
  }

  async postRequest<SuccessResponse>(
    path: string,
    requestBody: object,
  ): Promise<ApiResponseSuccess<SuccessResponse> | ApiResponse<ErrorResponse>> {
    const host = process.env.NODE_ENV === "test" ? "http://testhost" : "";

    const response = await fetch(host + "/v1" + path, {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.responseHandler<SuccessResponse>(response);
  }

  async getRequest<SuccessResponse>(
    path: string,
  ): Promise<ApiResponseSuccess<SuccessResponse> | ApiResponse<ErrorResponse>> {
    const host = process.env.NODE_ENV === "test" ? "http://testhost" : "";
    const response = await fetch(host + "/v1" + path, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.responseHandler<SuccessResponse>(response);
  }
}
