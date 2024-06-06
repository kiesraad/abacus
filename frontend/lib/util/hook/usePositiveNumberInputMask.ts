import * as React from "react";

export type FormatFunc = (s: string | number | null | undefined) => string;
export type DeformatFunc = (s: string) => number;

export interface UsePositiveNumberInputMaskReturn {
  format: FormatFunc;
  deformat: DeformatFunc;
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
  const format: FormatFunc = React.useCallback((s) => {
    if (s === null || s === undefined || s === "") return "";
    let result = `${s}`.trim();
    console.log(result);
    if (!result.match(/^(\d*\.?)$|^(\d{1,3}(\.\d{3})+\.?)$/g)) {
      console.log("not allowed");
      // not allowed
      return "";
    }
    console.log(result);
    result = result.replace(/\D/g, "");
    result = numberFormatter.format(Number(result));
    return result;
  }, []);

  const deformat: DeformatFunc = React.useCallback((s: string) => {
    const separator = numberFormatter.format(11111).replace(/\p{Number}/gu, "");
    const escapedSeparator = separator.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

    const cleaned = s.replace(new RegExp(escapedSeparator, "g"), "");
    return parseInt(cleaned, 10);
  }, []);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (event) => {
      //remove all non numbers
      console.log("onChange");
      event.target.value = format(event.target.value);
    },
    [format],
  );

  const onLoad: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (event) => {
      event.target.value = format(event.target.value);
    },
    [format],
  );

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = React.useCallback((event) => {
    console.log("onPaste", event.clipboardData.getData("text/plain"));
  }, []);

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
    register,
  };
}
