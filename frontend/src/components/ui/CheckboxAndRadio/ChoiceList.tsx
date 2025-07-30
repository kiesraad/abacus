import { ReactNode, RefObject } from "react";

import { Checkbox, CheckboxAndRadioProps, Radio } from "./CheckboxAndRadio";
import cls from "./CheckboxAndRadio.module.css";

export interface ChoiceListProps {
  children: ReactNode;
}

export function ChoiceList({ children }: ChoiceListProps) {
  return <fieldset className="choiceList">{children}</fieldset>;
}

interface ChoiceListOptionProps extends CheckboxAndRadioProps {
  reference?: RefObject<HTMLInputElement>;
}

ChoiceList.Title = ({ children }: { children: ReactNode }) => <legend>{children}</legend>;

ChoiceList.Error = ({ id, children }: { id: string; children: ReactNode }) => (
  <p id={id} className={cls.error}>
    {children}
  </p>
);

ChoiceList.Checkbox = ({
  id,
  name,
  label,
  children,
  disabled,
  defaultChecked,
  hasError,
  reference,
  checked,
  onChange,
}: ChoiceListOptionProps) => (
  <Checkbox
    id={id}
    name={name}
    label={label}
    disabled={disabled}
    defaultChecked={defaultChecked}
    hasError={hasError}
    ref={reference}
    checked={checked}
    onChange={onChange}
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
