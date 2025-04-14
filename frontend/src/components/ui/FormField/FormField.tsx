import * as React from "react";

import { cn } from "@/lib/util/classnames";

import { t } from "@kiesraad/i18n";
import { IconError, IconWarning } from "@kiesraad/icon";

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
      className={cn(cls.formField, {
        hasIcon: !!icon,
        hasError: hasError,
        hasWarning: hasWarning && !hasError,
      })}
    >
      <aside>{icon}</aside>
      {children}
    </div>
  );
}
