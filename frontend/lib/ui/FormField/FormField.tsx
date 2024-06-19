import { ValidationResultCode } from "@kiesraad/api";
import * as React from "react";
import cls from "./FormField.module.css";

export interface FormFieldProps {
  children: React.ReactNode;
  error?: ValidationResultCode | ValidationResultCode[] | undefined;
  tooltip?: string | React.ReactNode;
}

export function FormField({ children, error, tooltip }: FormFieldProps) {
  return (
    <div className={cls.formField}>
      {tooltip ? (
        <div className="tooltip">
          {children}
          <span className="tooltiptext">{tooltip}</span>
        </div>
      ) : (
        children
      )}
      {error && <div>{error}</div>}
    </div>
  );
}
