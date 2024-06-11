import * as React from "react";
import { cn } from "@kiesraad/util";
import cls from "./BottomBar.module.css";

export interface BottomBarProps {
  type: "full" | "form";
  children: React.ReactNode;
}

export function BottomBar({ type, children }: BottomBarProps) {
  // TODO: Fix full bottom bar not sticking to footer
  return <div className={cn(cls["bottombar"], cls[type])}>{children}</div>;
}
