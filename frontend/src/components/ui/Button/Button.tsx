import type { ButtonHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import type { ButtonVariant, Size } from "@/types/ui";
import { cn } from "@/utils/classnames";
import cls from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: ButtonVariant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export function Button({
  isDisabled,
  isLoading,
  variant = "primary",
  size = "lg",
  leftIcon,
  rightIcon,
  children,
  ...htmlButtonProps
}: ButtonProps) {
  return (
    <button
      className={`${cls.button || ""} ${cls[variant] || ""} ${cls[size] || ""}`}
      disabled={isDisabled || isLoading}
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
  size?: Size;
}

function ButtonLink({ disabled, variant = "primary", size = "md", children, ...linkProps }: ButtonLinkProps) {
  const className = cn(cls.button, cls[variant], cls[size], "button", disabled ? cls.disabled : undefined);
  return (
    <Link className={className} {...linkProps}>
      {children}
    </Link>
  );
}

Button.Link = ButtonLink;

export interface ButtonLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: Size;
  children: ReactNode;
}

function ButtonLabel({ disabled, variant = "primary", size = "md", children, ...labelProps }: ButtonLabelProps) {
  const className = cn(cls.button, cls[variant], cls[size], disabled ? cls.disabled : undefined);
  return (
    <label className={className} {...labelProps}>
      {children}
    </label>
  );
}

Button.Label = ButtonLabel;
