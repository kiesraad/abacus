import * as React from "react";

import { Size, Variant } from "@kiesraad/ui";

import cls from "./Button.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  isDisabled,
  isLoading,
  variant = "default",
  size = "md",
  leftIcon,
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
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
