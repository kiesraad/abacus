import * as React from "react";

import { IconError, IconWarning } from "@/components/generated/icons";
import { cn } from "@/utils";
import { t } from "@/utils/i18n/i18n";

import cls from "./FormField.module.css";

export interface FormFieldProps {
  id?: string;
  children: React.ReactNode;
  hasError?: boolean;
  hasWarning?: boolean;
}

export function FormField({ id, children, hasError, hasWarning }: FormFieldProps) {
  let icon: React.ReactNode | null = null;
  if (hasError) {
    icon = <IconError aria-label={t("contains_error")} />;
  } else if (hasWarning) {
    icon = <IconWarning aria-label={t("contains_warning")} />;
  }

  return (
    <div
      id={id}
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
