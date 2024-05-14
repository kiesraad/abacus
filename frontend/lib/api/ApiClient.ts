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

export type ApiServerResponse<DATA> =
  | (Omit<Response, "json"> & {
      status: 200;
      json: () => DATA | PromiseLike<DATA>;
    })
  | (Omit<Response, "json"> & {
      status: 422;
      json: () => ApiResponseErrorData | PromiseLike<ApiResponseErrorData>;
    })
  | (Omit<Response, "json"> & {
      status: 500;
      json: () => ApiResponseErrorData | PromiseLike<ApiResponseErrorData>;
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

  async responseHandler<DATA>(response: Response) {
    const res = response as ApiServerResponse<DATA>;
    if (res.status === 200) {
      return { status: "success", code: 200, data: { ok: true } } as ApiResponseSuccess<DATA>;
    } else if (res.status === 422) {
      const data = await res.json();
      return {
        status: "client_error",
        code: 422,
        data,
      } as ApiResponseClientError<ApiResponseErrorData>;
    } else if (res.status === 500) {
      const data = await res.json();
      return {
        status: "server_error",
        code: 500,
        data,
      } as ApiResponseServerError<ApiResponseErrorData>;
    }
    throw new Error(`Unexpected response status: ${res.status}`);
  }

  async postRequest<DATA>(
    path: string,
    requestBody: object,
  ): Promise<ApiResponseSuccess<DATA> | ApiResponse<ApiResponseErrorData>> {
    const host = process.env.NODE_ENV === "test" ? "http://testhost" : "";

    const response = await fetch(host + "/v1" + path, {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.responseHandler<DATA>(response);
  }
}
