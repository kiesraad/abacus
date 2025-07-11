import * as React from "react";

import { IconWarningSquare } from "@/components/generated/icons";
import { tx } from "@/i18n/translate";
import { deformatNumber, formatNumber, validateNumberString } from "@/utils/format";

import { Icon } from "../Icon/Icon";
import { Tooltip } from "../Tooltip/Tooltip";

function ellipsis(text: string, maxLength: number = 20): string {
  // Normalize whitespace: replace newlines and multiple spaces with single spaces
  // (newlines are converted to line breaks in the i18n code)
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (normalizedText.length <= maxLength) {
    return normalizedText;
  }

  return normalizedText.substring(0, maxLength - 3) + "...";
}

export type NumberInputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;

export function NumberInput({ id, ...inputProps }: NumberInputProps) {
  const [tooltipInvalidValue, setTooltipInvalidValue] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const props = {
    className: "font-number",
    maxLength: 9,
    autoComplete: "off",
    ...inputProps,
    defaultValue: inputProps.defaultValue ? formatNumber(inputProps.defaultValue) : undefined,
    type: "text",
  };

  const hideTooltip = React.useCallback(() => {
    setTooltipInvalidValue(null);
  }, []);

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = React.useCallback((event) => {
    const pastedInput = event.clipboardData.getData("text/plain");
    if (!validateNumberString(pastedInput)) {
      event.preventDefault();
      setTooltipInvalidValue(pastedInput);
    }
  }, []);

  const tooltipContent = tooltipInvalidValue ? (
    <div className="tooltip-content">
      <Icon color="warning" icon={<IconWarningSquare />} />
      <span>{tx("invalid_paste_content", undefined, { value: ellipsis(tooltipInvalidValue) })}</span>
    </div>
  ) : null;

  return (
    <Tooltip content={tooltipContent} onClose={hideTooltip}>
      <input
        {...props}
        ref={inputRef}
        onPaste={onPaste}
        onFocus={onFocus}
        onBlur={onBlur(props.onChange)}
        onInput={onInput}
        id={id}
        name={props.name || id}
      />
    </Tooltip>
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
