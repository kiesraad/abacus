import * as React from "react";

import { IconCheckmarkSmall, IconDot, IconMinus } from "@kiesraad/icon";
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
  ({ id, name, type, label, children, indeterminate, disabled, defaultChecked, hasError }, ref) => {
    const [checked, setChecked] = React.useState(defaultChecked);

    React.useEffect(() => {
      setChecked(defaultChecked);
    }, [defaultChecked]);

    const toggle = () => {
      if (!disabled) {
        setChecked((prev) => !prev);
        if (type === "radio") {
          // TODO: toggle other radio button
        }
      }
    };

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setChecked(event.currentTarget.checked);
    };

    return (
      <div className={cn(cls["checkbox-and-radio"])} aria-label="input" id={`${type}-container-${id}`}>
        <div
          className={cn({ checked: !!checked }, type, { disabled: !!disabled }, { "has-error": !!hasError }, "field")}
          aria-hidden={true}
          onClick={toggle}
          id={`${type}-button-${id}`}
        >
          {type === "radio" ? (
            <IconDot aria-label={checked ? "Aangevinkt" : "Uitgevinkt"} />
          ) : indeterminate !== true ? (
            <IconCheckmarkSmall aria-label={checked ? "Aangevinkt" : "Uitgevinkt"} />
          ) : (
            <IconMinus aria-label={checked ? "Aangevinkt" : "Uitgevinkt"} />
          )}
        </div>
        <input type={type} id={id} name={name} checked={checked} onChange={onChange} ref={ref} disabled={disabled} />
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
