import * as React from "react";

import {
  IconArrowNarrowRight,
  IconAsterisk,
  IconCheckmark,
  IconMinus,
  IconWarning,
} from "@kiesraad/icon";
import { cn } from "@kiesraad/util";

import { MenuStatus } from "../ui.types";
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
  active?: boolean;
  status: MenuStatus;
  children?: React.ReactNode;
};

ProgressList.Item = function ({ active, status, children }: ProgressListItemProps) {
  let title = undefined;
  let icon = <IconArrowNarrowRight />;
  if (!active) {
    [title, icon] = renderStatusIcon(status);
  }

  return (
    <li className={cn(active ? "active" : "idle", status)} aria-current={active ? "step" : false}>
      <aside title={title || undefined}>{icon}</aside>
      <label>{children}</label>
    </li>
  );
};

function renderStatusIcon(status: MenuStatus): [string | undefined, React.JSX.Element] {
  switch (status) {
    case "accept":
      return ["Ingevoerd", <IconCheckmark />];
    case "warning":
      return ["Ingevoerd, met openstaande waarschuwingen", <IconWarning />];
    case "empty":
      return ["Geen invoer gedaan", <IconMinus />];
    case "updates":
      return ["Updates", <IconAsterisk />];
    default:
      return [undefined, <></>];
  }
}
