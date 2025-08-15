import * as React from "react";

import { cn } from "@/utils/classnames";

import cls from "./LinkButton.module.css";

export interface LinkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title?: string;
  text: string;
}

export function LinkButton({ title, text, ...htmlButtonProps }: LinkButtonProps) {
  return (
    <button className={cn(cls.linkButton)} title={title} {...htmlButtonProps}>
      {text}
    </button>
  );
}
