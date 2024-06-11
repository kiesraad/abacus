import * as React from "react";
import { IconArrownarrowright, IconCheckmark, IconWarning } from "@kiesraad/icon";
import cls from "./progresslist.module.css";
import { cn } from "@kiesraad/util";

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
        status: "accept" | "idle";
      }
    | {
        status: "reject";
        message: string;
      }
  );

ProgressList.Item = function ({ status, active, children }: ProgressListItemProps) {
  return (
    <li className={cn(active ? "active" : "idle", status)}>
      <aside>{active ? <IconArrownarrowright /> : renderStatusIcon(status)}</aside>
      <label>{children}</label>
    </li>
  );
};

function renderStatusIcon(status: "accept" | "reject" | "idle") {
  switch (status) {
    case "accept":
      return <IconCheckmark />;
    case "reject":
      return <IconWarning />;
    default:
      return null;
  }
}
