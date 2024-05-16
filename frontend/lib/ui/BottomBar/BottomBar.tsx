import * as React from "react";
import cls from "./BottomBar.module.css";

export interface BottomBarProps {
  children: React.ReactNode;
}

export function BottomBar({ children }: BottomBarProps) {
  // TODO: Fix bottom bar not sticking to footer
  return <div className={cls.bottombar}>{children}</div>;
}
