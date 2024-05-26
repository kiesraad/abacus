import * as React from "react";
import cls from "./Button.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: "default" | "secondary" | "icon";
  size?: "sm" | "md" | "lg";
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
      {rightIcon && rightIcon}
    </button>
  );
}
