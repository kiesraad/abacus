import * as React from "react";

import { formatNumber, validateNumberString } from "@kiesraad/util";

export interface NumberInputProps
  extends React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> {
  id: string;
}

export function NumberInput({ id, ...inputProps }: NumberInputProps) {
  const props = {
    ...inputProps,
    defaultValue: inputProps.defaultValue ? formatNumber(inputProps.defaultValue) : "",
    type: "text",
    maxLength: 11,
  };

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = React.useCallback((event) => {
    const pastedInput = event.clipboardData.getData("text/plain");
    if (!validateNumberString(pastedInput)) {
      event.preventDefault();
      //TODO: show tooltip
    }
  }, []);

  return (
    <input {...props} onChange={onChange} onPaste={onPaste} onKeyDown={onKeyDown} id={id} name={props.name || id} />
  );
}

function onChange(event: React.ChangeEvent<HTMLInputElement>) {
  let caretPosition = event.target.selectionStart;
  const inputValue = event.target.value;
  const newValue = formatNumber(inputValue);

  if (caretPosition) {
    caretPosition += newValue.length - inputValue.length;
  }
  event.target.value = formatNumber(event.target.value);
  //restore caret position
  event.target.setSelectionRange(caretPosition, caretPosition);
}

function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Delete" && event.key !== "Backspace") return;
  const inputValue = event.currentTarget.value;
  const caretPosition = event.currentTarget.selectionStart;
  if (!caretPosition) return;

  if (event.key === "Backspace") {
    if (inputValue.charAt(caretPosition - 1) === ".") {
      //remove an extra char
      event.currentTarget.setSelectionRange(caretPosition - 1, caretPosition - 1);
    }
  } else {
    if (inputValue.charAt(caretPosition) === ".") {
      //remove an extra char
      event.currentTarget.setSelectionRange(caretPosition + 1, caretPosition + 1);
    }
  }
}
