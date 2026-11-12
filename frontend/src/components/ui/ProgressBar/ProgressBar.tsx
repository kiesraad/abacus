import { cn } from "@/utils/classnames";

import cls from "./ProgressBar.module.css";

export type ProgressBarColorClass =
  | "default"
  | "errors-and-warnings"
  | "in-progress"
  | "first-entry-finished"
  | "definitive"
  | "not-started";

export type PercentageAndColorClass = {
  percentage: number;
  class: ProgressBarColorClass;
};

export interface ProgressBarProps {
  id: string;
  data: PercentageAndColorClass | PercentageAndColorClass[];
  title?: string;
  spacing?: "small" | "large";
  showPercentage?: boolean;
}
export function ProgressBar({ id, data, title, spacing, showPercentage = false }: ProgressBarProps) {
  const percentage = !Array.isArray(data) ? Math.min(100, Math.max(0, data.percentage)) : undefined;
  return (
    <div className={cn(cls.progressbarContainer, spacing)} id={`progressbar-${id}`}>
      {title && <span id="progressbar-label">{title}</span>}
      {!Array.isArray(data) ? (
        <section>
          <div
            className={cls.progressbarOuter}
            role="progressbar"
            aria-labelledby="progressbar-label"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={cn(cls.progressbarInner, data.class)} style={{ width: `${percentage}%` }} />
          </div>
          {showPercentage && <aside>{percentage}%</aside>}
        </section>
      ) : (
        <section>
          <div id="multi-outer-bar" className={cls.progressbarOuter} style={{ height: "0.75rem" }}>
            {data.map((bar) => {
              const percentage = Math.min(100, Math.max(0, bar.percentage));
              return (
                <div
                  className={cn(cls.progressbarInner, bar.class, percentage === 0 ? "hidden" : undefined)}
                  style={{ width: `${percentage}%` }}
                  key={`inner-bar-${bar.class}`}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
