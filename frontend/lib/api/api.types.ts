import {
  ApiClient,
  ApiError,
  ApiResponseStatus,
  FatalApiError,
  LoginResponse,
  NetworkError,
  NotFoundError,
  type ValidationResultCode,
} from "@kiesraad/api";

export type ResultCode = ValidationResultCode | "REFORMAT_WARNING";

export type FieldValidationResult = {
  code: ResultCode;
  id: string;
  value?: string;
};

export type ErrorsAndWarnings = {
  errors: FieldValidationResult[];
  warnings: FieldValidationResult[];
};

export type AnyApiError = ApiError | FatalApiError | NetworkError | NotFoundError;

export type ApiResult<T, E = AnyApiError> = ApiResponse<T> | E;

export interface ServerError {
  error: string;
}

export type RequestMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiResponse<T> {
  status: ApiResponseStatus.Success;
  code: number;
  data: T;
}

export interface ApiState {
  client: ApiClient;
  user: LoginResponse | null;
  setUser: (user: LoginResponse | null) => void;
  logout: () => Promise<void>;
}
