import * as React from "react";

import { Size, Variant } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./IconButton.module.css";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  title: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: Variant;
  isRound?: boolean;
  size?: Size;
}

export function IconButton({
  icon,
  title,
  isDisabled,
  isLoading,
  isRound = false,
  variant = "default",
  size = "md",
  ...htmlButtonProps
}: IconButtonProps) {
  return (
    <button
      className={cn(cls["iconbutton"], cls[variant], cls[size], {
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
