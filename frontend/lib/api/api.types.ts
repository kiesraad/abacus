import { ApiError, ApiResponseStatus, NetworkError, type ValidationResultCode } from "@kiesraad/api";

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

export type ApiResult<T> = ApiResponse<T> | ApiError | NetworkError;

export interface ServerError {
  error: string;
}

export type RequestMethod = "GET" | "POST" | "DELETE";

export interface ApiResponse<T> {
  status: ApiResponseStatus.Success;
  code: number;
  data: T;
}
