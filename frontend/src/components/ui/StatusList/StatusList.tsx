import * as React from "react";

import { MenuStatus } from "@/types/ui";
import { cn } from "@/utils/classnames";

import { StatusIcon } from "../Icon/StatusIcon";
import cls from "./StatusList.module.css";

export interface StatusListProps extends React.HTMLAttributes<HTMLUListElement> {
  children: React.ReactNode;
}
export function StatusList({ children, ...props }: StatusListProps) {
  return (
    <ul className={cls.list} {...props}>
      {children}
    </ul>
  );
}

export interface StatusListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  status: MenuStatus;
  children: React.ReactNode;
  emphasis?: boolean;
  padding?: boolean;
}

StatusList.Item = function StatusListItem({ status, children, emphasis, padding, ...props }: StatusListItemProps) {
  return (
    <li className={cn(status, { emphasis: !!emphasis }, { padding: !!padding })} {...props}>
      <aside>
        <StatusIcon status={status} />
      </aside>
      <span>{children}</span>
    </li>
  );
};

StatusList.Title = function StatusListTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className={cls.title}>
      {children}
    </div>
  );
};
