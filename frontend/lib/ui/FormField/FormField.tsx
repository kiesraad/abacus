import { type ResultCode } from "@kiesraad/api";
import * as React from "react";
import cls from "./FormField.module.css";
import { cn } from "@kiesraad/util";
import { IconError } from "@kiesraad/icon";

export interface FormFieldProps {
  children: React.ReactNode;
  error?: ResultCode | ResultCode[] | undefined;
  tooltip?: string | React.ReactNode;
}

export function FormField({ children, error, tooltip }: FormFieldProps) {
  return (
    <div
      className={cn(cls["form-field"], {
        "has-error": !!error,
      })}
    >
      <aside>{error && <IconError />}</aside>
      {tooltip ? <div className="tooltip">{children}</div> : children}
    </div>
  );
}
