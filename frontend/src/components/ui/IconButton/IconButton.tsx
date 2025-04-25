import * as React from "react";

import { ButtonVariant, Size } from "@/types/ui";
import { cn } from "@/utils/classnames";

import cls from "./IconButton.module.css";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  title: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: ButtonVariant;
  isRound?: boolean;
  size?: Size;
}

export function IconButton({
  icon,
  title,
  isDisabled,
  isLoading,
  isRound = false,
  variant = "primary",
  size = "md",
  ...htmlButtonProps
}: IconButtonProps) {
  return (
    <button
      className={cn(cls.iconButton, cls[variant], cls[size], {
        round: isRound,
      })}
      title={title}
      disabled={isDisabled || isLoading}
      {...htmlButtonProps}
    >
      {icon}
    </button>
  );
}
