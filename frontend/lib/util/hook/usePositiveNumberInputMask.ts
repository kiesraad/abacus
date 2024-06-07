import * as React from "react";
import { useTooltip } from "@kiesraad/ui";

export type FormatFunc = (s: string | number | null | undefined) => string;
export type DeformatFunc = (s: string) => number;
export type ValidateFunc = (s: string | number | null | undefined) => boolean;

export interface UsePositiveNumberInputMaskReturn {
  format: FormatFunc;
  deformat: DeformatFunc;
  validate: ValidateFunc;
  register: () => {
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onLoad: React.ChangeEventHandler<HTMLInputElement>;
    onPaste: React.ClipboardEventHandler<HTMLInputElement>;
  };
}

const numberFormatter = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0,
});

export function usePositiveNumberInputMask(): UsePositiveNumberInputMaskReturn {
  const { show, hide } = useTooltip();

  const format: FormatFunc = React.useCallback((s) => {
    if (s === null || s === undefined) return "";
    let result = `${s}`.replace(/\D/g, "");
    if (result === "") return "";
    result = numberFormatter.format(Number(result));
    return result;
  }, []);

  const deformat: DeformatFunc = React.useCallback((s: string) => {
    const separator = numberFormatter.format(11111).replace(/\p{Number}/gu, "");
    const escapedSeparator = separator.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

    const cleaned = s.replace(new RegExp(escapedSeparator, "g"), "");
    return parseInt(cleaned, 10);
  }, []);

  const validate: ValidateFunc = React.useCallback((s) => {
    if (s === null || s === undefined || s === "") return false;
    const result = `${s}`.trim();
    return !!result.match(/^(\d*\.?)$|^(\d{1,3}(\.\d{3})+\.?)$/g);
  }, []);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (event) => {
      // remove all non digits
      event.target.value = format(event.target.value);
      hide();
    },
    [format, hide],
  );

  const onLoad: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (event) => {
      event.target.value = format(event.target.value);
    },
    [format],
  );

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = React.useCallback(
    (event) => {
      const pastedInput = event.clipboardData.getData("text/plain");
      if (!validate(pastedInput)) {
        event.preventDefault();
        show({
          anchor: event.currentTarget,
          position: "top",
          html: `Je probeert <strong>${pastedInput}</strong> te plakken. Je kunt hier alleen cijfers invullen.`,
        });
      }
    },
    [validate, show],
  );

  const register = () => {
    return {
      onChange,
      onLoad,
      onPaste,
    };
  };

  return {
    format,
    deformat,
    validate,
    register,
  };
}
