import * as React from "react";

import { cn } from "@kiesraad/util";

import cls from "./CheckboxAndRadio.module.css";

export interface CheckboxAndRadioProps {
  id: string;
  name?: string;
  type?: "checkbox" | "radio";
  label: string;
  children?: React.ReactNode;
  indeterminate?: boolean;
  disabled?: boolean;
  hasError?: boolean;
  defaultChecked?: boolean;
}

export const CheckboxAndRadio = React.forwardRef<HTMLInputElement, CheckboxAndRadioProps>(
  ({ id, name, type, label, children, indeterminate, disabled, hasError, defaultChecked }, ref) => {
    const [checked, setChecked] = React.useState(defaultChecked);

    React.useEffect(() => {
      setChecked(defaultChecked);
    }, [defaultChecked]);

    React.useEffect(() => {
      if (checked && indeterminate) {
        const input = document.getElementById(id) as HTMLInputElement;
        input.indeterminate = true;
      }
    }, [id, indeterminate, checked]);

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setChecked(event.currentTarget.checked);
    };

    return (
      <div className={cn(cls["checkbox-and-radio"])} aria-label="input" id={`${type}-container-${id}`}>
        <input
          className={type}
          type={type}
          id={id}
          name={name}
          checked={checked}
          onChange={onChange}
          ref={ref}
          disabled={disabled}
          aria-invalid={hasError}
        />
        <div className="labels">
          <label htmlFor={id}>{label}</label>
          {children !== undefined && <span className="description">{children}</span>}
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
