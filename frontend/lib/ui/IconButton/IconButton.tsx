import * as React from "react";
import cls from "./IconButton.module.css";
import { cn } from "@kiesraad/util";
import { Size, Variant } from "../ui.types";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: Variant;
  isRound?: boolean;
  size?: Size;
}

export function IconButton({
  icon,
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
      disabled={isDisabled || isLoading}
      {...htmlButtonProps}
    >
      {icon}
    </button>
  );
}
