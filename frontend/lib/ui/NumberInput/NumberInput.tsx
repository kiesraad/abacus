import * as React from "react";

import { deformatNumber, formatNumber, validateNumberString } from "@kiesraad/util";

export type NumberInputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export function NumberInput({ id, ...inputProps }: NumberInputProps) {
  const props = {
    maxLength: 9,
    autoComplete: "off",
    ...inputProps,
    defaultValue: inputProps.defaultValue ? formatNumber(inputProps.defaultValue) : "",
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
      onBlur={onBlur}
      onKeyDown={onKeyDown}
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
//format number on blur
function onBlur(event: React.FocusEvent<HTMLInputElement>) {
  if (event.target.value === "") return;
  event.target.value = formatNumber(event.target.value);
}

//only accept numbers
function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
  //allow keyboard shortcuts and navigation (e.g. copy paste, select all, arrow keys)
  if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }
  if (event.key.length === 1 && isNaN(parseInt(event.key))) {
    event.preventDefault();
  }
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
