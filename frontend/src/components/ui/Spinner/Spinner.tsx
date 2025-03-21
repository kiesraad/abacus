import * as React from "react";

import { Size } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Spinner.module.css";

export interface SpinnerProps {
  size?: Size;
  children?: React.ReactNode;
}

export function Spinner({ size = "md", children }: SpinnerProps) {
  return (
    <div className={cn(cls.container, size)} role="progressbar" aria-busy={true}>
      <div className={cls.spinner}>
        <svg viewBox="0 0 50 50">
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
