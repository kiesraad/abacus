import * as React from "react";

import { cn } from "@kiesraad/util";

import { MenuStatus } from "../ui.types";
import { renderStatusIcon } from "../util";
import cls from "./StatusList.module.css";

export function StatusList({ children }: { children: React.ReactNode }) {
  return <ul className={cls.list}>{children}</ul>;
}

export interface StatusListItemProps {
  status: MenuStatus;
  children: React.ReactNode;
  emphasis?: boolean;
}

StatusList.Item = function StatusListItem({ status, children, emphasis }: StatusListItemProps) {
  return (
    <li className={cn(status, { emphasis: !!emphasis })}>
      <aside>{renderStatusIcon(status)}</aside>
      <article>{children}</article>
    </li>
  );
};
