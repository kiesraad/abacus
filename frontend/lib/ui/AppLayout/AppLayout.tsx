import * as React from "react";

import cls from "./AppLayout.module.css";

export interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return <div className={cls["app-layout"]}>{children}</div>;
}
