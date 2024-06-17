import cls from "./InputField.module.css";

export interface InputFieldProps {
  name: string;
  label: string;
  subtext?: string;
  hint?: string;
  value?: string;
  type?: string;
  size?: "small" | "medium" | "large" | "text-area";
  width?: "narrow" | "wide";
  error?: string;
  disabled?: boolean;
  margin?: boolean;
  pattern?: string;
  title?: string;
}

export function InputField({
  name,
  label,
  subtext = "",
  hint = "",
  value,
  type = "text",
  size = "large",
  width = "wide",
  error = "",
  disabled = false,
  margin = true,
  pattern = "",
  title = "",
}: InputFieldProps) {
  return (
    <div className={`${cls.inputfield} ${margin ? "margin" : ""}`}>
      <label className={`${size} ${width} ${error ? "error" : ""}`}>
        <span className="label">
          {label} {subtext && <span className="subtext">{subtext}</span>}
        </span>
        {disabled ? (
          <div className={`${size} disabled_input`}>{value || undefined}</div>
        ) : size == "text-area" ? (
          <textarea
            name={name}
            value={value || undefined}
            aria-invalid={error ? "true" : "false"}
            aria-errormessage={error ? `${name}-hint_or_error` : undefined}
            rows={7}
          />
        ) : (
          <input
            name={name}
            value={value || undefined}
            type={type}
            pattern={pattern || undefined}
            title={title || undefined}
            aria-invalid={error ? "true" : "false"}
            aria-errormessage={error ? `${name}-hint_or_error` : undefined}
          />
        )}
      </label>
      <span id={`${name}-hint_or_error`} className={error ? "error" : "hint"}>
        {error || hint || <>&nbsp;</>}
      </span>
    </div>
  );
}
