import { ReactNode } from "react";

import { ValidationResultCode } from "@kiesraad/api";

export type ClientValidationResultCode = "F101" | ValidationResultCode;

export interface FeedbackItem {
  title: string;
  code?: string;
  content: ReactNode;
  action?: ReactNode;
}
