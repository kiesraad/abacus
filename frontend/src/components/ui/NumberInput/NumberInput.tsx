import * as React from "react";

import { deformatNumber, formatNumber, validateNumberString } from "@/utils/format";

export type NumberInputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export function NumberInput({ id, ...inputProps }: NumberInputProps) {
  const props = {
    className: "font-number",
    maxLength: 9,
    autoComplete: "off",
    ...inputProps,
    defaultValue: inputProps.defaultValue ? formatNumber(inputProps.defaultValue) : undefined,
    type: "text",
  };

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = React.useCallback((event) => {
    const pastedInput = event.clipboardData.getData("text/plain");
    if (!validateNumberString(pastedInput)) {
      event.preventDefault();
      //TODO: show tooltip
    }
  }, []);

  return (
    <input
      {...props}
      onPaste={onPaste}
      onFocus={onFocus}
      onBlur={onBlur(props.onChange)}
      onInput={onInput}
      id={id}
      name={props.name || id}
    />
  );
}

//deformat number on focus
function onFocus(event: React.FocusEvent<HTMLInputElement>) {
  if (event.target.value === "") return;
  const input = event.currentTarget;
  const newValue = `${deformatNumber(event.target.value)}`;
  const wasSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;

  input.value = newValue;

  //if text is selected, keep it selected
  if (wasSelected) {
    input.setSelectionRange(0, event.currentTarget.value.length);
  }
}

//format number on blur and call onChange if provided
function onBlur(onChange?: React.ChangeEventHandler<HTMLInputElement>) {
  return function (event: React.FocusEvent<HTMLInputElement>) {
    if (event.target.value === "") return;
    const oldValue = event.target.value;
    const newValue = formatNumber(event.target.value);
    event.target.value = newValue;
    if (onChange) {
      //only call onChange if the value has changed
      if (oldValue !== newValue) {
        onChange(event);
      }
    }
  };
}

//only accept numbers
function onInput(event: React.FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  input.value = input.value.replace(/[^0-9]/g, "");
}
