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

/**
 Archived for potential future use

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
  if (event.key !== "Delete" && event.key !== "Backspace" && event.key !== "ArrowLeft" && event.key !== "ArrowRight")
    return;
  const inputValue = event.currentTarget.value;
  let caretPosition = event.currentTarget.selectionStart || 0;
  let selectionEnd = event.currentTarget.selectionEnd || caretPosition;

  if (event.key === "Backspace") {
    if (inputValue.charAt(caretPosition - 1) === ".") {
      //remove an extra char
      event.currentTarget.setSelectionRange(caretPosition - 1, caretPosition - 1);
    }
  } else if (event.key === "Delete") {
    if (inputValue.charAt(caretPosition) === ".") {
      //remove an extra char
      event.currentTarget.setSelectionRange(caretPosition + 1, caretPosition + 1);
    }

    // ArrowLeft and ArrowRight selection
  } else {
    console.log("S:", caretPosition, "E:", selectionEnd);
    if (event.key === "ArrowLeft") {
      if (inputValue.charAt(caretPosition - 1) === ".") {
        caretPosition -= 1;
      }
      //event.key === ArrowRight
    } else {
      if (inputValue.charAt(selectionEnd) === ".") {
        selectionEnd += 1;
      }
    }

    if (event.shiftKey) {
      event.currentTarget.setSelectionRange(caretPosition, selectionEnd);
    } else {
      event.currentTarget.setSelectionRange(caretPosition, caretPosition);
    }
  }
}
 */
