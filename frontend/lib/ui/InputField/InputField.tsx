import * as React from "react";

import { NumberInput } from "@kiesraad/ui";

import cls from "./InputField.module.css";

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
  subtext?: string;
  hint?: string;
  fieldSize?: "small" | "medium" | "large" | "text-area";
  fieldWidth?: "narrow" | "wide" | "narrow-field";
  error?: string;
  margin?: boolean;
  numberInput?: boolean;
  hideErrorMessage?: boolean;
}

export function InputField({
  name,
  label,
  subtext = "",
  hint = "",
  value = undefined,
  type = "text",
  fieldSize = "large",
  fieldWidth = "wide",
  error = "",
  disabled = false,
  margin = true,
  autoFocus,
  numberInput,
  hideErrorMessage,
  ...InputFieldProps
}: InputFieldProps) {
  let inputEl: React.ReactNode;
  const commonProps: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> = {
    name,
    value,
    type,
    autoComplete: "off",
    autoFocus,
    "aria-invalid": error ? "true" : "false",
    "aria-errormessage": error ? `${name}-hint_or_error` : undefined,
    ...InputFieldProps,
  };

  if (fieldSize === "text-area") {
    inputEl = (
      <textarea
        name={name}
        value={value}
        autoComplete="off"
        autoFocus={autoFocus}
        aria-invalid={error ? "true" : "false"}
        aria-errormessage={error ? `${name}-hint_or_error` : undefined}
        rows={7}
      />
    );
  } else if (numberInput) {
    inputEl = <NumberInput {...commonProps} />;
  } else {
    inputEl = <input {...commonProps} />;
  }

  return (
    <div className={`${cls.inputfield} ${margin ? "mb-lg" : ""}`}>
      <label className={`${fieldSize} ${fieldWidth} ${error ? "error" : ""}`}>
        <span className="label">
          {label} {subtext && <span className="subtext">{subtext}</span>}
        </span>
        {disabled ? <div className={`${fieldSize} disabled_input`}>{value}</div> : inputEl}
      </label>
      {!hideErrorMessage && (error || hint) && (
        <span id={`${name}-hint_or_error`} className={error ? "error" : "hint"}>
          {error || hint || <>&nbsp;</>}
        </span>
      )}
    </div>
  );
}
