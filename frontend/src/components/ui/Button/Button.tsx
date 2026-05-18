import type { ButtonHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import type { ButtonVariant, Size } from "@/types/ui";
import { cn } from "@/utils/classnames";
import cls from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: ButtonVariant;
  className?: string;
  size?: Size;
  type?: "submit" | "reset" | "button";
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export function Button({
  isDisabled,
  isLoading,
  variant = "primary",
  className = "",
  size = "lg",
  type = "button",
  leftIcon,
  rightIcon,
  children,
  ...htmlButtonProps
}: ButtonProps) {
  return (
    <button
      className={`${cls.button || ""} ${cls[variant] || ""} ${cls[size] || ""} ${className}`}
      disabled={isDisabled || isLoading}
      type={type}
      {...htmlButtonProps}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

export interface ButtonLinkProps extends LinkProps {
  disabled?: boolean;
  variant?: ButtonVariant;
  className?: string;
  size?: Size;
}

function ButtonLink({
  disabled,
  variant = "primary",
  className = "",
  size = "md",
  children,
  ...linkProps
}: ButtonLinkProps) {
  const classNames = cn(cls.button, cls[variant], cls[size], "button", disabled ? cls.disabled : undefined, className);
  return (
    <Link className={classNames} {...linkProps}>
      {children}
    </Link>
  );
}

Button.Link = ButtonLink;

export interface ButtonLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  disabled?: boolean;
  variant?: ButtonVariant;
  className?: string;
  size?: Size;
  htmlFor: string;
  children: ReactNode;
}

function ButtonLabel({
  disabled,
  variant = "primary",
  className = "",
  size = "md",
  htmlFor,
  children,
  ...labelProps
}: ButtonLabelProps) {
  const classNames = cn(cls.button, cls[variant], cls[size], disabled ? cls.disabled : undefined, className);
  return (
    <label className={classNames} htmlFor={htmlFor} {...labelProps}>
      {children}
    </label>
  );
}

Button.Label = ButtonLabel;
