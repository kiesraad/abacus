import cls from "./InputField.module.css";

export interface InputFieldProps {
  name: string;
  label: string;
  hint?: string;
  value?: string;
  type?: string;
  size?: "small" | "large" | "text-area";
  disabled?: boolean;
}

export function InputField({
  name,
  label,
  hint = "",
  value,
  type = "text",
  size = "large",
  disabled = false,
}: InputFieldProps) {
  return (
    <label className={`${cls.inputfield} ${size}`}>
      <span className="label">{label}</span>
      <input name={name} value={value} type={type} disabled={disabled} />
      <span className="hint">{hint || <>&nbsp;</>}</span>
    </label>
  );
}
