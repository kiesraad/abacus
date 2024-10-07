import * as React from "react";

// import { IconCheckmarkSmall, IconDot, IconMinus } from "@kiesraad/icon";
import { cn } from "@kiesraad/util";

import cls from "./CheckboxOrRadio.module.css";

export interface CheckboxOrRadioProps {
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

export const CheckboxOrRadio = React.forwardRef<HTMLInputElement, CheckboxOrRadioProps>(
  ({ id, name, type, label, children, indeterminate, disabled, defaultChecked }, ref) => {
    const [checked, setChecked] = React.useState(defaultChecked);

    React.useEffect(() => {
      setChecked(defaultChecked);
    }, [defaultChecked]);

    React.useEffect(() => {
      if (indeterminate) {
        const input = document.getElementById(id) as HTMLInputElement;
        input.indeterminate = true;
      }
    }, [id, indeterminate]);

    // const toggle = () => {
    //   if (!disabled) {
    //     setChecked((prev) => !prev);
    //     if (type === "radio") {
    //       // TODO: toggle other radio button
    //     }
    //   }
    // };

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setChecked(event.currentTarget.checked);
    };

    return (
      <div className={cn(cls["checkbox-and-radio"])} aria-label="input" id={`${type}-container-${id}`}>
        {/*<div*/}
        {/*  className={cn({ checked: !!checked }, type, { disabled: !!disabled }, { "has-error": !!hasError }, "field")}*/}
        {/*  aria-hidden={true}*/}
        {/*  onClick={toggle}*/}
        {/*  id={`${type}-button-${id}`}*/}
        {/*>*/}
        {/*  {type === "radio" ? (*/}
        {/*    <IconDot aria-label={checked ? "Aangevinkt" : "Uitgevinkt"} />*/}
        {/*  ) : indeterminate !== true ? (*/}
        {/*    <IconCheckmarkSmall aria-label={checked ? "Aangevinkt" : "Uitgevinkt"} />*/}
        {/*  ) : (*/}
        {/*    <IconMinus aria-label={checked ? "Aangevinkt" : "Uitgevinkt"} />*/}
        {/*  )}*/}
        {/*</div>*/}
        <input
          className={type}
          type={type}
          id={id}
          name={name}
          checked={checked}
          onChange={onChange}
          ref={ref}
          disabled={disabled}
        />
        <div className="labels">
          <label htmlFor={id}>{label}</label>
          {children !== undefined && <span className="description">{children}</span>}
        </div>
      </div>
    );
  },
);

CheckboxOrRadio.displayName = "CheckboxOrRadio";

export const CheckboxNew = React.forwardRef<HTMLInputElement, CheckboxOrRadioProps>((props, ref) => {
  return <CheckboxOrRadio {...props} type="checkbox" ref={ref} />;
});

export const RadioNew = React.forwardRef<HTMLInputElement, CheckboxOrRadioProps>((props, ref) => {
  return <CheckboxOrRadio {...props} type="radio" ref={ref} />;
});
