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
}: InputFieldProps) {
  return (
    <div className={`${cls.question}`}>
      <label className={`${cls.inputfield} ${size} ${width} ${error ? "error" : ""}`}>
        <span className="label">
          {label} <span className="subtext">{subtext}</span>
        </span>
        {size == "text-area" ? (
          <textarea name={name} value={value} disabled={disabled} rows={7} />
        ) : (
          <input name={name} value={value} type={type} disabled={disabled} />
        )}
        <span className="hint">{error || hint || <>&nbsp;</>}</span>
      </label>
    </div>
  );
}
