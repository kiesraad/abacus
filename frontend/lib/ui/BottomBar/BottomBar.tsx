import * as React from "react";

import { cn } from "@kiesraad/util";

import cls from "./BottomBar.module.css";

export interface BottomBarProps {
  type: "footer" | "form" | "input-grid";
  children: React.ReactNode;
}

export function BottomBar({ type, children }: BottomBarProps) {
  return <div className={cn(cls["bottom-bar"], cls[type])}>{children}</div>;
}
