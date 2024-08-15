import * as React from "react";

import {
  IconArrowNarrowRight,
  IconAsterisk,
  IconCheckmark,
  IconMinus,
  IconPencil,
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
  const icon = renderStatusIcon(active ? "active" : status);

  return (
    <li className={cn(active ? "active" : "idle", status)} aria-current={active ? "step" : false}>
      <aside>{icon}</aside>
      <label>{children}</label>
    </li>
  );
};

function renderStatusIcon(status: MenuStatus): React.JSX.Element {
  switch (status) {
    case "active":
      return <IconArrowNarrowRight />; // "Actief"
    case "accept":
      return <IconCheckmark />; // "Ingevoerd"
    case "warning":
      return <IconWarning />; // "Ingevoerd, met openstaande waarschuwingen"
    case "empty":
      return <IconMinus />; // "Geen invoer gedaan"
    case "updates":
      return <IconAsterisk />; // "Updates"
    case "unsaved":
      return <IconPencil />; // "Niet opgeslagen wijzigingen"
    default:
      return <></>;
  }
}
