import { ReactNode } from "react";

export interface FeedbackItem {
  title: string;
  code?: string;
  content: ReactNode;
  action?: ReactNode;
}
