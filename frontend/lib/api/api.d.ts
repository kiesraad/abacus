import { type ValidationResultCode } from "./gen/openapi";
export type ResultCode = ValidationResultCode | "REFORMAT_WARNING";

export type ErrorsAndWarnings = {
  errors: ResultCode[];
  warnings: ResultCode[];
};
