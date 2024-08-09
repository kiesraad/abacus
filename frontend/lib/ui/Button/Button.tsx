import * as React from "react";

import { Size, Variant } from "../ui.types";
import cls from "./Button.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: Variant;
  size?: Size;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  isDisabled,
  isLoading,
  variant = "default",
  size = "md",
  rightIcon,
  children,
  ...htmlButtonProps
}: ButtonProps) {
  return (
    <button
      className={`${cls["button"] || ""} ${cls[variant] || ""} ${cls[size] || ""}`}
      disabled={isDisabled || isLoading}
      {...htmlButtonProps}
    >
      {children}
      {rightIcon}
    </button>
  );
}
