import * as React from "react";

import { MenuStatus, renderStatusIcon } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./ProgressList.module.css";

export interface ProgressListProps {
  children?: React.ReactNode;
}

export function ProgressList({ children }: ProgressListProps) {
  return <ul className={cls["progress-list"]}>{children}</ul>;
}

ProgressList.Ruler = () => <li className="ruler">&nbsp;</li>;

// active is not a status since we might want to show both concurrently.
export type ProgressListItemProps = {
  status: MenuStatus;
  active?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  id?: string;
};

ProgressList.Item = function ({ active, status, disabled, children, id }: ProgressListItemProps) {
  const icon = renderStatusIcon(active ? "active" : status);

  return (
    <li
      id={id}
      className={cn(active ? "active" : "idle", status, { disabled: !!disabled })}
      aria-current={active ? "step" : false}
    >
      <aside>{icon}</aside>
      <label>{children}</label>
    </li>
  );
};
