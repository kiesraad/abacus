import * as React from "react";

import { CheckboxNew, CheckboxOrRadioProps, RadioNew } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./CheckboxOrRadio.module.css";

export function ChoiceListNew({ children }: { children: React.ReactNode }) {
  return <fieldset className={cn(cls["choice-list"])}>{children}</fieldset>;
}

interface ChoiceListNewOptionProps extends CheckboxOrRadioProps {
  reference?: React.RefObject<HTMLInputElement>;
}

ChoiceListNew.Title = ({ children }: { children: React.ReactNode }) => (
  <legend>
    <h6>{children}</h6>
  </legend>
);

ChoiceListNew.Checkbox = ({
  id,
  name,
  label,
  children,
  disabled,
  defaultChecked,
  hasError,
  reference,
}: ChoiceListNewOptionProps) => (
  <CheckboxNew
    id={id}
    name={name}
    label={label}
    disabled={disabled}
    defaultChecked={defaultChecked}
    hasError={hasError}
    ref={reference}
  >
    {children}
  </CheckboxNew>
);

ChoiceListNew.Radio = ({
  id,
  name,
  label,
  children,
  disabled,
  defaultChecked,
  hasError,
  reference,
}: ChoiceListNewOptionProps) => (
  <RadioNew
    id={id}
    name={name}
    label={label}
    disabled={disabled}
    defaultChecked={defaultChecked}
    hasError={hasError}
    ref={reference}
  >
    {children}
  </RadioNew>
);
