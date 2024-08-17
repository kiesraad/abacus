import * as React from "react";

import { cn } from "@kiesraad/util";

import cls from "./BottomBar.module.css";

export interface BottomBarProps {
  type: "footer" | "form" | "inputgrid";
  children: React.ReactNode;
}

export function BottomBar({ type, children }: BottomBarProps) {
  return <div className={cn(cls["bottombar"], cls[type])}>{children}</div>;
}

BottomBar.Row = function BottomBarRow({
  children,
  hidden,
}: {
  children: React.ReactNode;
  hidden?: boolean;
}) {
  return <section className={cn("row", { hidden: !!hidden })}>{children}</section>;
};
