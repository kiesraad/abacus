import * as React from "react";
import { Size } from "../ui.types";
import cls from "./Spinner.module.css";
import { cn } from "@kiesraad/util";

export interface SpinnerProps {
  size?: Size;
  children?: React.ReactNode;
}

export function Spinner({ size = "md", children }: SpinnerProps) {
  return (
    <div
      className={cn(cls.container, {
        size,
      })}
    >
      <div className={cls.spinner}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      {children && <label>{children}</label>}
    </div>
  );
}
