import * as React from "react";

import cls from "./InputField.module.css";

export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
  subtext?: string;
  hint?: string;
  fieldSize?: "small" | "medium" | "large" | "text-area";
  fieldWidth?: "narrow" | "wide";
  error?: string;
  margin?: boolean;
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
  ...InputFieldProps
}: InputFieldProps) {
  return (
    <div className={`${cls.inputfield} ${margin ? "margin" : ""}`}>
      <label className={`${fieldSize} ${fieldWidth} ${error ? "error" : ""}`}>
        <span className="label">
          {label} {subtext && <span className="subtext">{subtext}</span>}
        </span>
        {disabled ? (
          <div className={`${fieldSize} disabled_input`}>{value}</div>
        ) : fieldSize === "text-area" ? (
          <textarea
            name={name}
            value={value}
            autoComplete="off"
            aria-invalid={error ? "true" : "false"}
            aria-errormessage={error ? `${name}-hint_or_error` : undefined}
            rows={7}
          />
        ) : (
          <input
            name={name}
            value={value}
            type={type}
            autoComplete="off"
            aria-invalid={error ? "true" : "false"}
            aria-errormessage={error ? `${name}-hint_or_error` : undefined}
            {...InputFieldProps}
          />
        )}
      </label>
      <span id={`${name}-hint_or_error`} className={error ? "error" : "hint"}>
        {error || hint || <>&nbsp;</>}
      </span>
    </div>
  );
}
