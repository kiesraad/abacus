import { ApiError, ApiResponseStatus, NetworkError, NotFoundError, type ValidationResultCode } from "@kiesraad/api";

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

export type ApiResult<T, E = ApiError | NotFoundError | NetworkError> = ApiResponse<T> | E;

export interface ServerError {
  error: string;
}

export type RequestMethod = "GET" | "POST" | "DELETE";

export interface ApiResponse<T> {
  status: ApiResponseStatus.Success;
  code: number;
  data: T;
}
