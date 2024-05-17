import * as React from "react";
import cls from "./Button.module.css";
import { cn } from "@kiesraad/util";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: "default" | "secondary";
  isRound?: boolean;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
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
