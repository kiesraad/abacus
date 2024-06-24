import * as React from "react";
import {
  IconArrowNarrowRight,
  IconAsterisk,
  IconCheckmark,
  IconMinus,
  IconWarning,
} from "@kiesraad/icon";
import { cn } from "@kiesraad/util";
import cls from "./ProgressList.module.css";

export interface ProgressListProps {
  children?: React.ReactNode;
}

export function ProgressList({ children }: ProgressListProps) {
  return <ul className={cls.progresslist}>{children}</ul>;
}

ProgressList.Ruler = () => <li className="ruler">&nbsp;</li>;

// active is not a status since we might want to show both concurrently.

export type BaseProgressListItemProps = {
  message?: string;
  active?: boolean;
  children?: React.ReactNode;
};

export type ProgressListItemProps = BaseProgressListItemProps &
  (
    | {
        status: "accept" | "updates" | "empty" | "idle";
      }
    | {
        status: "warning";
        message: string;
      }
  );

ProgressList.Item = function ({ status, active, children }: ProgressListItemProps) {
  return (
    <li className={cn(active ? "active" : "idle", status)}>
      <aside>{active ? <IconArrowNarrowRight /> : renderStatusIcon(status)}</aside>
      <label>{children}</label>
    </li>
  );
};

function renderStatusIcon(status: "accept" | "warning" | "empty" | "updates" | "idle") {
  switch (status) {
    case "accept":
      return <IconCheckmark />;
    case "warning":
      return <IconWarning />;
    case "empty":
      return <IconMinus />;
    case "updates":
      return <IconAsterisk />;
    default:
      return null;
  }
}
