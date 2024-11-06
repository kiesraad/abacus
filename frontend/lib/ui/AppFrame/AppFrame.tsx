import * as React from "react";

import cls from "./AppFrame.module.css";

export interface AppFrameProps {
  children: React.ReactNode;
}

//Low in functionality, but it provides an entry point into the UI library loading all styles.

export function AppFrame({ children }: AppFrameProps) {
  return (
    <div id="appframe" className={cls["app-frame"]}>
      {children}
    </div>
  );
}
