export interface ApiResponse<DataType> {
  status: ApiResponseStatus;
  code: number;
  data?: DataType;
}

export interface ApiResponseErrorData {
  errorCode: number;
  message: string;
}

export enum ApiResponseStatus {
  Success,
  ClientError,
  ServerError,
}

export class ApiClient {
  host: string;

  constructor(host: string) {
    this.host = host;
  }

  async responseHandler<SuccessResponseType>(response: Response) {
    let data;
    if (response.headers.get("Content-Type") === "application/json") {
      try {
        data = (await response.json()) as SuccessResponseType;
      } catch (err: unknown) {
        console.error("Server response parse error:", err);
        throw new Error(`Server response parse error: ${response.status}`);
      }
    } else {
      data = await response.text();
      if (data.length > 0) {
        console.error("Unexpected data from server:", data);
        throw new Error(`Unexpected data from server: ${data}`);
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

    return {
      status: status,
      code: response.status,
      data,
    } as ApiResponse<SuccessResponseType>;
  }

  async postRequest<SuccessResponseType>(
    path: string,
    requestBody?: object,
  ): Promise<ApiResponse<SuccessResponseType>> {
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

    return this.responseHandler<SuccessResponseType>(response);
  }

  async getRequest<SuccessResponseType>(path: string): Promise<ApiResponse<SuccessResponseType>> {
    const host = process.env.NODE_ENV === "test" ? "http://testhost" : "";

    const response = await fetch(host + path, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return this.responseHandler<SuccessResponseType>(response);
  }

  async deleteRequest<SuccessResponseType>(path: string): Promise<ApiResponse<SuccessResponseType>> {
    const host = process.env.NODE_ENV === "test" ? "http://testhost" : "";
    const response = await fetch(host + path, { method: "DELETE" });
    return this.responseHandler<SuccessResponseType>(response);
  }
}
