import { type ReactNode, useEffect, useRef } from "react";

import type { MenuStatus } from "@/types/ui";
import { cn } from "@/utils/classnames";

import { StatusIcon } from "../Icon/StatusIcon";
import cls from "./ProgressList.module.css";
import { ProgressListScroll } from "./ProgressListScroll";

export interface ProgressListProps {
  children?: ReactNode;
}

export function ProgressList({ children }: ProgressListProps) {
  return <div className={cls.progressList}>{children}</div>;
}

ProgressList.Fixed = ({ children }: { children: ReactNode }) => (
  <section className="fixed">
    <ul className="fixed">{children}</ul>
  </section>
);
ProgressList.Scroll = ProgressListScroll;

// active is not a status since we might want to show both concurrently.
export type ProgressListItemProps = {
  status: MenuStatus;
  active?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  id?: string;
  scrollIntoView?: boolean;
  addSpace?: boolean;
};

ProgressList.Item = function ProgressListItem({
  active = false,
  status,
  disabled = false,
  children,
  id,
  scrollIntoView,
  addSpace = false,
}: ProgressListItemProps) {
  const liRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (scrollIntoView && active) {
      liRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [scrollIntoView, active]);

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
      <div>{children}</div>
    </li>
  );
};

export type ProgressListOverviewItemProps = {
  status: "warning" | "idle";
  addSpace?: boolean;
  id?: string;
  children?: ReactNode;
};

ProgressList.OverviewItem = function ProgressListOverviewItem({
  status,
  addSpace,
  id,
  children,
}: ProgressListOverviewItemProps) {
  const liRef = useRef<HTMLLIElement>(null);

  return (
    <li ref={liRef} id={id} className={cn(cls.overviewItem, status, addSpace && cls.addSpace)}>
      <aside>
        <StatusIcon status={status} />
      </aside>
      <div>{children}</div>
    </li>
  );
};
