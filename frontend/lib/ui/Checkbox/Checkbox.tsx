import * as React from "react";

import { IconCheckmark } from "@kiesraad/icon";
import { cn } from "@kiesraad/util";

import cls from "./Checkbox.module.css";

interface CheckboxProps {
  id: string;
  children: React.ReactNode;
  hasError?: boolean;
  defaultChecked?: boolean;
}

//TODO: you can't style a border for a checkbox, currently outline is used as a workaround but the border radius doesnt match

export function Checkbox({ id, children, defaultChecked, hasError }: CheckboxProps) {
  const [checked, setChecked] = React.useState(defaultChecked);

  React.useEffect(() => {
    setChecked(defaultChecked);
  }, [defaultChecked]);

  const toggleCheckbox = () => {
    setChecked((prev) => !prev);
  };

  return (
    <div
      className={cn(cls.checkbox, { "has-error": !!hasError })}
      aria-label="input"
      id={`checkbox-container-${id}`}
    >
      <div aria-hidden={true} onClick={toggleCheckbox} id={`checkbox-button-${id}`}>
        {checked ? <IconCheckmark aria-label="Aangevinkt" /> : null}
      </div>
      <input type="checkbox" id={id} name={id} checked={checked} onChange={toggleCheckbox} />
      <label htmlFor={id}>{children}</label>
    </div>
  );
}
