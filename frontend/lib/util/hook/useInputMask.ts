import * as React from "react";

export interface UseInputMaskParams {}

export interface UseInputMaskReturn {
  register: () => {
    onChange: React.ChangeEventHandler<HTMLInputElement>;
  };
}

export function useInputMask({}: UseInputMaskParams): UseInputMaskReturn {
  const numberFormatter = React.useMemo(() => {
    return new Intl.NumberFormat("nl-NL", {
      maximumFractionDigits: 0
    });
  }, []);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
    (event) => {
      //remove all non numbers
      const value = event.target.value.replace(/\D/g, "");
      if (value !== "") {
        event.target.value = numberFormatter.format(Number(value));
      } else {
        event.target.value = "";
      }
    },
    [numberFormatter]
  );

  const register = () => {
    return {
      onChange
    };
  };

  return {
    register
  };
}
