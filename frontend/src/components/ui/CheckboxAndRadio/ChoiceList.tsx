import { ReactNode, RefObject } from "react";

import { cn } from "@/utils/classnames";

import { Checkbox, CheckboxAndRadioProps, Radio } from "./CheckboxAndRadio";
import cls from "./CheckboxAndRadio.module.css";

export interface ChoiceListProps {
  children: ReactNode;
}

export function ChoiceList({ children }: ChoiceListProps) {
  return <fieldset className={cn(cls.choiceList)}>{children}</fieldset>;
}

interface ChoiceListOptionProps extends CheckboxAndRadioProps {
  reference?: RefObject<HTMLInputElement>;
}

ChoiceList.Title = ({ children }: { children: ReactNode }) => <legend>{children}</legend>;

ChoiceList.Error = ({ children }: { children: ReactNode }) => <p className={cls.error}>{children}</p>;

ChoiceList.Checkbox = ({
  id,
  name,
  label,
  children,
  disabled,
  defaultChecked,
  hasError,
  reference,
}: ChoiceListOptionProps) => (
  <Checkbox
    id={id}
    name={name}
    label={label}
    disabled={disabled}
    defaultChecked={defaultChecked}
    hasError={hasError}
    ref={reference}
  >
    {children}
  </Checkbox>
);

ChoiceList.Radio = ({
  id,
  name,
  label,
  checked,
  children,
  disabled,
  autoFocus,
  defaultChecked,
  defaultValue,
  hasError,
  reference,
  value,
  onChange,
}: ChoiceListOptionProps) => (
  <Radio
    id={id}
    name={name}
    label={label}
    checked={checked}
    disabled={disabled}
    autoFocus={autoFocus}
    defaultChecked={defaultChecked}
    hasError={hasError}
    ref={reference}
    defaultValue={defaultValue}
    value={value}
    onChange={onChange}
  >
    {children}
  </Radio>
);
