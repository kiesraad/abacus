import type { ReactNode } from "react";

import type { Size } from "@/types/ui";
import { cn } from "@/utils/classnames";

import cls from "./Spinner.module.css";

export interface SpinnerProps {
  size?: Size;
  children?: ReactNode;
}

export function Spinner({ size = "md", children }: SpinnerProps) {
  return (
    <div className={cn(cls.container, size)} role="progressbar" aria-busy={true}>
      <div className={cls.spinner}>
        <svg viewBox="0 0 50 50" role="img" aria-label="Spinner" xmlns="http://www.w3.org/2000/svg" version="1.1">
          <rect />
          <rect />
          <rect />
          <rect />
          <rect />
          <rect />
          <rect />
          <rect />
        </svg>
      </div>
      {children && <label>{children}</label>}
    </div>
  );
}
