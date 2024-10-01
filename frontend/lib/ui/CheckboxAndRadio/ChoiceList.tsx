import * as React from "react";

import { CheckboxAndRadio, CheckboxAndRadioProps } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./CheckboxAndRadio.module.css";

export function ChoiceList({ children }: { children: React.ReactNode }) {
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
  <CheckboxAndRadio
    id={id}
    name={name}
    type="checkbox"
    label={label}
    disabled={disabled}
    defaultChecked={defaultChecked}
    hasError={hasError}
    ref={reference}
  >
    {children}
  </CheckboxAndRadio>
);

ChoiceList.CheckboxIndeterminate = ({
  id,
  name,
  label,
  children,
  disabled,
  defaultChecked,
  hasError,
  reference,
}: ChoiceListOptionProps) => (
  <CheckboxAndRadio
    id={id}
    name={name}
    type="checkbox"
    label={label}
    indeterminate
    disabled={disabled}
    defaultChecked={defaultChecked}
    hasError={hasError}
    ref={reference}
  >
    {children}
  </CheckboxAndRadio>
);

ChoiceList.Radio = ({
  id,
  name,
  label,
  children,
  disabled,
  defaultChecked,
  hasError,
  reference,
}: ChoiceListOptionProps) => (
  <CheckboxAndRadio
    id={id}
    name={name}
    type="radio"
    label={label}
    disabled={disabled}
    defaultChecked={defaultChecked}
    hasError={hasError}
    ref={reference}
  >
    {children}
  </CheckboxAndRadio>
);
