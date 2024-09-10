import * as React from "react";

import { IconCheckmarkSmall } from "@kiesraad/icon";
import { cn } from "@kiesraad/util";

import cls from "./Checkbox.module.css";

interface CheckboxProps {
  id: string;
  children: React.ReactNode;
  hasError?: boolean;
  defaultChecked?: boolean;
}

export function Checkbox({ id, children, defaultChecked, hasError }: CheckboxProps) {
  const [checked, setChecked] = React.useState(defaultChecked);

  React.useEffect(() => {
    setChecked(defaultChecked);
  }, [defaultChecked]);

  const toggleCheckbox = () => {
    setChecked((prev) => !prev);
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
  };

  return (
    <div
      className={cn(cls.checkbox, { "has-error": !!hasError })}
      aria-label="input"
      id={`checkbox-container-${id}`}
    >
      <div
        className={checked ? "checked" : "unchecked"}
        aria-hidden={true}
        onClick={toggleCheckbox}
        id={`checkbox-button-${id}`}
      >
        <IconCheckmarkSmall aria-label={checked ? "Aangevinkt" : "uitgevinkt"} />
      </div>
      <input type="checkbox" id={id} name={id} checked={checked} onChange={onChange} />
      <label htmlFor={id}>{children}</label>
    </div>
  );
}
