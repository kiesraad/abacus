import type { ReactNode } from "react";

import cls from "./AppFrame.module.css";

export interface AppFrameProps {
  children: ReactNode;
}

//Low in functionality, but it provides an entry point into the UI library loading all styles.

export function AppFrame({ children }: AppFrameProps) {
  return (
    <div id="app-frame" className={cls.appFrame}>
      {children}
    </div>
  );
}
