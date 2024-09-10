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
  return (
    <div className={cn(cls.checkbox, { "has-error": !!hasError })} aria-label="input" id={`checkbox-container-${id}`}>
      <input type="checkbox" id={id} name={id} defaultChecked={defaultChecked} />
      <label htmlFor={id}>{children}</label>
    </div>
  );
}
