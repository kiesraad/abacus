import { type ValidationResultCode } from "./gen/openapi";
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
