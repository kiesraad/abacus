import * as React from "react";

import { MenuStatus, renderStatusIcon } from "@/components/ui";
import { cn } from "@/utils";

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
      <aside>{renderStatusIcon(status)}</aside>
      <span>{children}</span>
    </li>
  );
};
