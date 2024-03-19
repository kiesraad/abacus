import * as React from "react";
import classes from "./Button.module.less";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isDisabled?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({ isDisabled, isLoading, children, ...htmlButtonProps }: ButtonProps) {
  return (
    <button className={classes["button-default"]} disabled={isDisabled || isLoading} {...htmlButtonProps}>
      {children}
    </button>
  );
}
