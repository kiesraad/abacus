import { cn } from "@kiesraad/util";

import cls from "./ProgressBar.module.css";

export type ProgressBarColorClass =
  | "default"
  | "errors-and-warnings"
  | "unfinished"
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
  return (
    <div className={cn(cls.progressbarContainer, spacing)} id={`progressbar-${id}`}>
      {title && <label id="progressbar-label">{title}</label>}
      {!Array.isArray(data) ? (
        <section>
          <div
            className={cls.progressbarOuter}
            role="progressbar"
            aria-labelledby="progressbar-label"
            aria-valuenow={data.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={cn(cls.progressbarInner, data.class)} style={{ width: `${data.percentage}%` }} />
          </div>
          {showPercentage && <aside>{data.percentage}%</aside>}
        </section>
      ) : (
        <section>
          <div id="multi-outer-bar" className={cls.progressbarOuter} style={{ height: "0.75rem" }}>
            {data.map((bar, index) => {
              return (
                <div
                  className={cn(cls.progressbarInner, bar.class, bar.percentage === 0 ? "hidden" : undefined)}
                  style={{ width: `${bar.percentage}%` }}
                  key={`inner-bar-${index}`}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
