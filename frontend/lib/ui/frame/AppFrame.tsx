import * as React from "react";

export interface AppFrameProps {
  children: React.ReactNode;
}

//Low in functionality, but it provides an entry point into the UI library loading all styles.

export function AppFrame({ children }: AppFrameProps) {
  return <div className="app-frame">{children}</div>;
}
