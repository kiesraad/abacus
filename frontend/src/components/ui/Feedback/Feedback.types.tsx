import { ReactNode } from "react";

import { ValidationResultCode } from "@/types/generated/openapi";

export type ClientValidationResultCode = "F101" | ValidationResultCode;

export interface FeedbackItem {
  title: string;
  code?: string;
  content: ReactNode;
  action?: ReactNode;
}
