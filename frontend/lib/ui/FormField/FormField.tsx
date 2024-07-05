import { type FieldValidationResult } from "@kiesraad/api";
import * as React from "react";
import cls from "./FormField.module.css";
import { cn } from "@kiesraad/util";
import { IconError, IconWarning } from "@kiesraad/icon";
import { Tooltip } from "../Tooltip/Tooltip";

export interface FormFieldProps {
  children: React.ReactNode;
  error?: FieldValidationResult[];
  warning?: FieldValidationResult[];
  tooltip?: string | React.ReactNode;
}

export function FormField({ children, error, warning, tooltip }: FormFieldProps) {
  const hasError = error && error.length > 0;
  const hasWarning = warning && warning.length > 0;

  let icon: React.ReactNode | null = null;
  if (hasError) {
    icon = <IconError />;
  } else if (hasWarning) {
    icon = <IconWarning />;
  }

  return (
    <div
      className={cn(cls["form-field"], {
        "has-icon": !!icon,
        "has-error": hasError,
        "has-warning": hasWarning && !hasError,
      })}
    >
      <aside>{icon}</aside>
      <Tooltip content={tooltip}>{children}</Tooltip>
    </div>
  );
}
