import * as React from "react";

import { cn } from "@kiesraad/util";

import cls from "./Toolbar.module.css";

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}
export function Toolbar({ children, ...htmlProps }: ToolbarProps) {
  return (
    <nav className={cls.toolbar} {...htmlProps}>
      {children}
    </nav>
  );
}

export interface ToolbarSectionProps extends React.HTMLAttributes<HTMLElement> {
  pos?: "start" | "center" | "end";
  children: React.ReactNode;
}
export function ToolbarSection({ children, pos = "start", ...htmlProps }: ToolbarSectionProps) {
  return (
    <section className={cn(cls.toolbarSection, cls[pos])} {...htmlProps}>
      {children}
    </section>
  );
}

Toolbar.Section = ToolbarSection;
