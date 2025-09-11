import * as React from "react";

import { IconWarningSquare } from "@/components/generated/icons";
import { tx } from "@/i18n/translate";
import { formatNumber, validateNumberString } from "@/utils/number";

import { Icon } from "../Icon/Icon";
import { Tooltip } from "../Tooltip/Tooltip";
import cls from "./NumberInput.module.css";

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

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { id, ...inputProps },
  ref,
) {
  const [tooltipInvalidValue, setTooltipInvalidValue] = React.useState<string | null>(null);
  const [formattedOverlay, setFormattedOverlay] = React.useState<string | undefined>(
    formatNumber(inputProps.value !== undefined ? inputProps.value : inputProps.defaultValue),
  );

  const props = {
    className: "font-number",
    maxLength: 9,
    autoComplete: "off",
    ...inputProps,
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

  function onFocus() {
    setFormattedOverlay(undefined);
  }

  function onBlur(event: React.FocusEvent<HTMLInputElement>) {
    setFormattedOverlay(formatNumber(event.target.value));
  }

  return (
    <Tooltip content={tooltipContent} onClose={hideTooltip}>
      <div className={cls.container}>
        <input
          {...props}
          onPaste={onPaste}
          onFocus={onFocus}
          onBlur={onBlur}
          onInput={onInput}
          id={id}
          name={props.name || id}
          ref={ref}
        />
        {formattedOverlay && (
          <div className="formatted-overlay font-number" aria-hidden>
            <span id={`${id}-formatted-overlay`}>{formattedOverlay}</span>
          </div>
        )}
      </div>
    </Tooltip>
  );
});

//only accept numbers
function onInput(event: React.FormEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  input.value = input.value.replace(/[^0-9]/g, "");
}
