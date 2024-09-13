import * as React from "react";

import { IconError, IconWarning } from "@kiesraad/icon";
import { cn } from "@kiesraad/util";

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
    icon = <IconError aria-label={"bevat een fout"} />;
  } else if (hasWarning) {
    icon = <IconWarning aria-label={"bevat een waarschuwing"} />;
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
