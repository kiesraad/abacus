import * as React from "react";

import { type FieldValidationResult } from "@kiesraad/api";
import { IconError, IconWarning } from "@kiesraad/icon";
import { cn } from "@kiesraad/util";

import cls from "./FormField.module.css";

export interface FormFieldProps {
  children: React.ReactNode;
  error?: FieldValidationResult[];
  warning?: FieldValidationResult[];
}

export function FormField({ children, error, warning }: FormFieldProps) {
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
      {children}
    </div>
  );
}
