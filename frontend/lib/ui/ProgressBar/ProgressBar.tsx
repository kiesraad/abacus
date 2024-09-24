import cls from "./ProgressBar.module.css";

export interface ProgressBarProps {
  percent: number;
  title: string;
}
export function ProgressBar({ percent, title }: ProgressBarProps) {
  return (
    <div className={cls["progressbar-container"]}>
      <label>{title}</label>
      <section>
        <div
          className={cls["progressbar-outer"]}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={cls["progressbar-inner"]} />
        </div>
        <aside>{percent}%</aside>
      </section>
    </div>
  );
}
