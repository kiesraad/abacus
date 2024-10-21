import { cn } from "@kiesraad/util";

import cls from "./ProgressBar.module.css";

export type ProgressBarColorClass =
  | "default"
  | "errors_and_warnings"
  | "unfinished"
  | "in_progress"
  | "first_entry_finished"
  | "definitive"
  | "not_started";

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
    <div className={cn(cls["progressbar-container"], spacing)} id={`progressbar-${id}`}>
      {title && <label>{title}</label>}
      {!Array.isArray(data) ? (
        <section>
          <div
            className={cls["progressbar-outer"]}
            role="progressbar"
            aria-valuenow={data["percentage"]}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(cls["progressbar-inner"], cls[data["class"]])}
              style={{ width: `${data["percentage"]}%` }}
            />
          </div>
          {showPercentage && <aside>{data["percentage"]}%</aside>}
        </section>
      ) : (
        <section>
          <div className={cls["progressbar-outer"]} style={{ height: "0.75rem" }}>
            {data.map((bar, index) => {
              return (
                <div
                  className={cn(cls["progressbar-inner"], cls[bar.class])}
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
