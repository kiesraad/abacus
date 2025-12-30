import { type ChangeEvent, forwardRef, type InputHTMLAttributes, type ReactElement, type ReactNode } from "react";
import cls from "./CheckboxAndRadio.module.css";

export interface CheckboxAndRadioProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  type?: "checkbox" | "radio";
  label: string | ReactElement;
  checked?: boolean;
  children?: ReactNode;
  indeterminate?: boolean;
  hasError?: boolean;
  defaultChecked?: boolean;
  autoFocus?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const CheckboxAndRadio = forwardRef<HTMLInputElement, CheckboxAndRadioProps>(
  (
    {
      id,
      value,
      name,
      type,
      label,
      checked,
      children,
      indeterminate,
      disabled,
      autoFocus,
      onChange,
      hasError,
      defaultChecked,
      ...inputProps
    },
    ref,
  ) => {
    return (
      <div className={cls.checkboxAndRadio} id={`${type}-container-${id}`}>
        <input
          className={`${type}${indeterminate ? " indeterminate" : ""}`}
          type={type}
          id={id}
          value={value}
          name={name}
          checked={checked}
          defaultChecked={defaultChecked}
          ref={ref}
          onChange={onChange}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={hasError}
          {...inputProps}
        />
        <div className="labels">
          <label htmlFor={id}>
            {label}
            {children !== undefined && <div className="description">{children}</div>}
          </label>
        </div>
      </div>
    );
  },
);

CheckboxAndRadio.displayName = "CheckboxAndRadio";

export const Checkbox = forwardRef<HTMLInputElement, CheckboxAndRadioProps>((props, ref) => {
  return <CheckboxAndRadio {...props} type="checkbox" ref={ref} />;
});

export const Radio = forwardRef<HTMLInputElement, CheckboxAndRadioProps>((props, ref) => {
  return <CheckboxAndRadio {...props} type="radio" ref={ref} />;
});
