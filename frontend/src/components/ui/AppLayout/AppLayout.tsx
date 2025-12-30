import type { ReactNode } from "react";

import cls from "./AppLayout.module.css";

export interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return <div className={cls.appLayout}>{children}</div>;
}
