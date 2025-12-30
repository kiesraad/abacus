import type { DetailedHTMLProps, InputHTMLAttributes, ReactElement, ReactNode } from "react";

import { NumberInput } from "../NumberInput/NumberInput";
import cls from "./InputField.module.css";

export interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
  subtext?: string;
  hint?: string | ReactElement;
  fieldSize?: "small" | "medium" | "large" | "text-area";
  fieldWidth?:
    | "narrowest"
    | "narrow"
    | "narrowish"
    | "average"
    | "wide"
    | "full"
    | "full-field-with-narrowest-input"
    | "full-field-with-narrow-input"
    | "parent";
  error?: string;
  margin?: "mb-0" | "mb-sm" | "mb-md" | "mb-md-lg" | "mb-lg";
  numberInput?: boolean;
  hideErrorMessage?: boolean;
}

export function InputField({
  id,
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
  margin = "mb-0",
  autoFocus,
  numberInput,
  hideErrorMessage,
  ...inputFieldProps
}: InputFieldProps) {
  let inputEl: ReactNode;
  const commonProps: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> = {
    id,
    name,
    value,
    type,
    autoComplete: "off",
    autoFocus,
    "aria-invalid": error ? "true" : "false",
    "aria-errormessage": error ? `${name}-hint_or_error` : undefined,
    ...inputFieldProps,
  };

  if (fieldSize === "text-area") {
    inputEl = (
      <textarea
        id={id}
        name={name}
        value={value}
        defaultValue={inputFieldProps.defaultValue}
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
    <div className={`${cls.inputfield} ${margin}`}>
      <label className={`${fieldSize} ${fieldWidth} ${error ? "error" : ""}`} htmlFor={id}>
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
