import * as React from "react";

export interface BottomBarProps {
  children: React.ReactNode;
}

export function BottomBar({ children }: BottomBarProps) {
  return (
    <div
      style={{
        width: "100%",
        position: "fixed",
        bottom: "24px",
        left: "0",
        padding: "1.5rem 5rem",
        background: "#FFF",
      }}
    >
      {children}
    </div>
  );
}
