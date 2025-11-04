import * as React from "react";

import { MenuStatus } from "@/types/ui";
import { cn } from "@/utils/classnames";

import { StatusIcon } from "../Icon/StatusIcon";
import cls from "./ProgressList.module.css";
import { ProgressListScroll } from "./ProgressListScroll";

export interface ProgressListProps {
  children?: React.ReactNode;
}

export function ProgressList({ children }: ProgressListProps) {
  return <div className={cls.progressList}>{children}</div>;
}

ProgressList.Fixed = ({ children }: { children: React.ReactNode }) => (
  <section className="fixed">
    <ul className="fixed">{children}</ul>
  </section>
);
ProgressList.Scroll = ProgressListScroll;

ProgressList.Ruler = () => <li className="ruler">&nbsp;</li>;

// active is not a status since we might want to show both concurrently.
export type ProgressListItemProps = {
  status: MenuStatus;
  active?: boolean;
  disabled?: boolean;
  hide?: boolean;
  children?: React.ReactNode;
  id?: string;
  scrollIntoView?: boolean;
  addSpace?: boolean;
};

ProgressList.Item = function ProgressListItem({
  active = false,
  status,
  disabled = false,
  hide = false,
  children,
  id,
  scrollIntoView,
  addSpace = false,
}: ProgressListItemProps) {
  const liRef = React.useRef<HTMLLIElement>(null);

  React.useEffect(() => {
    if (scrollIntoView && active) {
      liRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [scrollIntoView, active]);

  if (hide) {
    return;
  }

  return (
    <li
      ref={liRef}
      id={id}
      className={cn(cls.item, { active: active }, status, { disabled: disabled }, addSpace && cls.addSpace)}
      aria-current={active ? "step" : false}
    >
      <aside>
        <StatusIcon status={active ? "active" : status} />
      </aside>
      <label>{children}</label>
    </li>
  );
};

export type ProgressListOverviewItemProps = {
  status: "warning" | "idle";
  addSpace?: boolean;
  id?: string;
  children?: React.ReactNode;
};

ProgressList.OverviewItem = function ProgressListOverviewItem({
  status,
  addSpace,
  id,
  children,
}: ProgressListOverviewItemProps) {
  const ref = React.useRef<HTMLLIElement>(null);

  return (
    <li ref={ref} id={id} className={cn(cls.overviewItem, status, addSpace && cls.addSpace)}>
      <aside>
        <StatusIcon status={status} />
      </aside>
      <label>{children}</label>
    </li>
  );
};
