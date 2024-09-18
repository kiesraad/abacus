import * as React from "react";

import cls from "./NumberInput.module.css";

export interface NumberInputProps extends React.HTMLAttributes<HTMLInputElement> {
  bla: boolean;
}

export function NumberInput({ bla, ...inputProps }: NumberInputProps) {
  return (
    <div>
      {bla ? "ja" : "nee"}
      <input className={cls["number-input"]} type="text" {...inputProps} />
    </div>
  );
}
