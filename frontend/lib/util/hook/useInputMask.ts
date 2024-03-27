import * as React from "react";

export interface UseInputMaskParams {}

export type FormatFunc = (s: string | number | null | undefined) => string;

export interface UseInputMaskReturn {
  format: FormatFunc;
  register: () => {
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    onLoad: React.ChangeEventHandler<HTMLInputElement>;
  };
}

const numberFormatter = new Intl.NumberFormat("nl-NL", {
  maximumFractionDigits: 0
});

export function useInputMask({}: UseInputMaskParams): UseInputMaskReturn {
  const format: FormatFunc = React.useCallback((s) => {
    if (!s) return "";
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
      console.log("Onload??", event.target.value);
      event.target.value = format(event.target.value);
    },
    [format]
  );

  const register = () => {
    return {
      onChange,
      onLoad
    };
  };

  return {
    format,
    register
  };
}
