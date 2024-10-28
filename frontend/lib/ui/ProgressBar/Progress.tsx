import { ReactNode } from "react";

import cls from "./Progress.module.css";

export function Progress({ children }: { children: ReactNode }) {
  return (
    <nav id="progress-section" className={cls["progress"]}>
      {children}
    </nav>
  );
}
