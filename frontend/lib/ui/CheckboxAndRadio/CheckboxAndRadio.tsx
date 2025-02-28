import * as React from "react";

import cls from "./CheckboxAndRadio.module.css";

export interface CheckboxAndRadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  type?: "checkbox" | "radio";
  label: string;
  checked?: boolean;
  children?: React.ReactNode;
  indeterminate?: boolean;
  hasError?: boolean;
  defaultChecked?: boolean;
  autoFocus?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CheckboxAndRadio = React.forwardRef<HTMLInputElement, CheckboxAndRadioProps>(
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

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxAndRadioProps>((props, ref) => {
  return <CheckboxAndRadio {...props} type="checkbox" ref={ref} />;
});

export const Radio = React.forwardRef<HTMLInputElement, CheckboxAndRadioProps>((props, ref) => {
  return <CheckboxAndRadio {...props} type="radio" ref={ref} />;
});
