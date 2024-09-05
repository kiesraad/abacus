import * as React from "react";

import {
  IconArrowNarrowRight,
  IconCheckmark,
  IconError,
  IconMinus,
  IconPencil,
  IconWarning,
} from "@kiesraad/icon";
import { MenuStatus } from "@kiesraad/ui";
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

function renderStatusIcon(status: MenuStatus): React.JSX.Element {
  switch (status) {
    case "active":
      return <IconArrowNarrowRight aria-label={"je bent hier"} />; // "Actief"
    case "accept":
      return <IconCheckmark aria-label={"opgeslagen"} />; // "Ingevoerd"
    case "warning":
      return <IconWarning aria-label={"bevat een waarschuwing"} />; // "Ingevoerd, met openstaande waarschuwingen"
    case "empty":
      return <IconMinus aria-label={"leeg"} />; // "Geen invoer gedaan"
    case "unsaved":
      return <IconPencil aria-label={"nog niet afgerond"} />; // "Niet opgeslagen wijzigingen"
    case "error":
      return <IconError aria-label={"bevat een fout"} />; // "Ingevoerd, met openstaande fouten"
    default:
      return <></>;
  }
}
