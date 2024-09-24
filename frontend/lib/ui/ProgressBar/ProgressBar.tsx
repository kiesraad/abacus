import { cn } from "@kiesraad/util";

import cls from "./ProgressBar.module.css";

export interface ProgressBarProps {
  percent: number;
  id: string;
  title?: string;
  spacing?: "small" | "large";
}
export function ProgressBar({ percent, id, title, spacing }: ProgressBarProps) {
  return (
    <div className={cn(cls["progressbar-container"], spacing)} id={`progressbar-${id}`}>
      {title && <label>{title}</label>}
      <section>
        <div
          className={cls["progressbar-outer"]}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={cls["progressbar-inner"]} style={{ width: `${percent}%` }} />
        </div>
        <aside>{percent}%</aside>
      </section>
    </div>
  );
}
