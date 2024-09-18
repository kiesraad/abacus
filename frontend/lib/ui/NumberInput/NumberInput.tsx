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

  return <input {...props} onChange={onChange} onPaste={onPaste} id={id} name={props.name || id} />;
}

function onChange(event: React.ChangeEvent<HTMLInputElement>) {
  let caretPosition = event.target.selectionStart;
  const newValue = formatNumber(event.target.value);
  if (caretPosition) {
    caretPosition += newValue.length - event.target.value.length;
  }
  event.target.value = formatNumber(event.target.value);
  //restore caret position
  event.target.setSelectionRange(caretPosition, caretPosition);
}
