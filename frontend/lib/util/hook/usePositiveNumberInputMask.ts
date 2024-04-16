import * as React from "react";

export type FormatFunc = (s: string | number | null | undefined) => string;

export interface UsePositiveNumberInputMaskReturn {
  format: FormatFunc;
  register: () => {
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onLoad: React.ChangeEventHandler<HTMLInputElement>;
    onPaste: React.ClipboardEventHandler<HTMLInputElement>;
  };
}

const numberFormatter = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0
});

export function usePositiveNumberInputMask(): UsePositiveNumberInputMaskReturn {
  const format: FormatFunc = React.useCallback((s) => {
    if (s === null || s === undefined) return "";
    if (s === "") {
      return "";
    }
    let result = `${s}`.replace(/\D/g, "");
    result = numberFormatter.format(Number(result));
    return result;
  }, []);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (event) => {
      //remove all non numbers
      event.target.value = format(event.target.value);
    },
    [format]
  );

  const onLoad: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (event) => {
      event.target.value = format(event.target.value);
    },
    [format]
  );

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = React.useCallback((event) => {
    console.log("Paste", event.clipboardData.getData("text/plain"));
  }, []);

  const register = () => {
    return {
      onChange,
      onLoad,
      onPaste
    };
  };

  return {
    format,
    register
  };
}
