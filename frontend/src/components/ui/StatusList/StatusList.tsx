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
  className?: string;
}

StatusList.Item = function StatusListItem({ status, children, className, ...props }: StatusListItemProps) {
  return (
    <li className={cn(status, className)} {...props}>
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

// Use around StatusList.Title and StatusList components
StatusList.Container = function StatusListContainer({ key, children }: { key: string; children: React.ReactNode }) {
  return (
    <div key={key} className={cls.container}>
      {children}
    </div>
  );
};

// Use around multiple StatusList.Container components
StatusList.Wrapper = function StatusListWrapper({ children }: { children: React.ReactNode }) {
  return <div className={cls.wrapper}>{children}</div>;
};
