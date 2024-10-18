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

export type RadiusClass = "no-radius" | "default-radius" | "no-radius-right" | "no-radius-left";
export type PercentageAndColorClass = {
  percentage: number;
  class: ProgressBarColorClass;
};

export interface ProgressBarProps {
  id: string;
  percentagesAndColorClasses: PercentageAndColorClass[];
  title?: string;
  spacing?: "small" | "large";
  showPercentage?: boolean;
}
export function ProgressBar({
  id,
  percentagesAndColorClasses,
  title,
  spacing,
  showPercentage = false,
}: ProgressBarProps) {
  const filteredBars = filterOutZeroPercentageBars(percentagesAndColorClasses);
  const totalBars = filteredBars.length;
  function filterOutZeroPercentageBars(bars: PercentageAndColorClass[]): PercentageAndColorClass[] {
    return bars.filter((bar) => bar.percentage > 0);
  }

  function getRadiusClassForBarIndex(barIndex: number): RadiusClass {
    if (totalBars === 1) {
      return "default-radius";
    }
    if (barIndex === 0) {
      return "no-radius-right";
    } else if (barIndex > 0 && barIndex < totalBars - 1) {
      return "no-radius";
    } else {
      return "no-radius-left";
    }
  }

  return (
    <div className={cn(cls["progressbar-container"], spacing)} id={`progressbar-${id}`}>
      {title && <label>{title}</label>}
      {percentagesAndColorClasses.length === 1 && percentagesAndColorClasses[0] ? (
        <section>
          <div
            className={cls["progressbar-outer"]}
            role="progressbar"
            aria-valuenow={percentagesAndColorClasses[0].percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(cls["progressbar-inner"], cls[percentagesAndColorClasses[0].class], "default-radius")}
              style={{ width: `${percentagesAndColorClasses[0].percentage}%` }}
            />
          </div>
          {showPercentage && <aside>{percentagesAndColorClasses[0].percentage}%</aside>}
        </section>
      ) : (
        <section>
          <div className={cls["progressbar-outer"]} style={{ height: "0.75rem" }}>
            {filteredBars.map((bar, index) => {
              return (
                <div
                  className={cn(cls["progressbar-inner"], cls[bar.class], cls[getRadiusClassForBarIndex(index)])}
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
