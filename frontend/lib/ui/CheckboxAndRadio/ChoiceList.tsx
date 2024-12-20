import * as React from "react";

import { Checkbox, CheckboxAndRadioProps, Radio } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./CheckboxAndRadio.module.css";

export interface ChoiceListProps {
  children: React.ReactNode;
}

export function ChoiceList({ children }: ChoiceListProps) {
  return <fieldset className={cn(cls["choice-list"])}>{children}</fieldset>;
}

interface ChoiceListOptionProps extends CheckboxAndRadioProps {
  reference?: React.RefObject<HTMLInputElement>;
}

ChoiceList.Title = ({ children }: { children: React.ReactNode }) => (
  <legend>
    <h6>{children}</h6>
  </legend>
);

ChoiceList.Error = ({ children }: { children: React.ReactNode }) => <p className={cls.error}>{children}</p>;

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
  children,
  disabled,
  autoFocus,
  defaultChecked,
  defaultValue,
  hasError,
  reference,
}: ChoiceListOptionProps) => (
  <Radio
    id={id}
    name={name}
    label={label}
    disabled={disabled}
    autoFocus={autoFocus}
    defaultChecked={defaultChecked}
    hasError={hasError}
    ref={reference}
    defaultValue={defaultValue}
  >
    {children}
  </Radio>
);
