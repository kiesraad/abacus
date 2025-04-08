import * as React from "react";
import { Link, LinkProps } from "react-router";

import { ButtonVariant, Size } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Button.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: ButtonVariant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  isDisabled,
  isLoading,
  variant = "primary",
  size = "md",
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
  const className = cn(cls.button, cls[variant], cls[size], disabled ? cls.disabled : undefined);
  return (
    <Link className={className} {...linkProps}>
      {children}
    </Link>
  );
}

Button.Link = ButtonLink;

export interface ButtonLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: Size;
  children: React.ReactNode;
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
