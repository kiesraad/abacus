import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/utils/classnames";

import cls from "./Toolbar.module.css";

export interface ToolbarProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
export function Toolbar({ children, ...htmlProps }: ToolbarProps) {
  return (
    <nav className={cn(cls.toolbar)} {...htmlProps}>
      {children}
    </nav>
  );
}

export interface ToolbarSectionProps extends HTMLAttributes<HTMLElement> {
  pos?: "start" | "center" | "end";
  children: ReactNode;
}
function ToolbarSection({ children, pos = "start", ...htmlProps }: ToolbarSectionProps) {
  return (
    <section className={cn(cls.toolbarSection, cls[pos])} {...htmlProps}>
      {children}
    </section>
  );
}

Toolbar.Section = ToolbarSection;
