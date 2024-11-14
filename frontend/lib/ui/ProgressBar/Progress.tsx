import { ReactNode } from "react";

import cls from "./Progress.module.css";

export function Progress({ children }: { children: ReactNode }) {
  return (
    <div className={cls.progress}>
      <nav id="progress-section" className={cls.progress}>
        {children}
      </nav>
    </div>
  );
}
