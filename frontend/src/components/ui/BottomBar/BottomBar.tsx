import * as React from "react";

import { cn } from "@/utils";

import cls from "./BottomBar.module.css";

export interface BottomBarProps {
  type: "footer" | "form" | "input-grid";
  children: React.ReactNode;
}

export function BottomBar({ type, children }: BottomBarProps) {
  return <div className={cn(cls["bottom-bar"], cls[type])}>{children}</div>;
}

BottomBar.Row = function BottomBarRow({ children, hidden }: { children: React.ReactNode; hidden?: boolean }) {
  return (
    <section hidden={hidden} className={cn("row", { hidden: !!hidden })}>
      {children}
    </section>
  );
};
