import * as React from "react";

import { MenuStatus } from "@/types/ui";
import { cn } from "@/utils/classnames";

import { StatusIcon } from "../Icon/StatusIcon";
import cls from "./StatusList.module.css";

export interface StatusListProps extends React.HTMLAttributes<HTMLUListElement> {
  gap?: "sm" | "md";
  children: React.ReactNode;
}
export function StatusList({ gap = "md", children, ...props }: StatusListProps) {
  return (
    <ul className={cn(cls.list, cls[gap])} {...props}>
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

export interface StatusListSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

// Use to wrap StatusList.Title and StatusList components
StatusList.Section = function StatusListContainer({ children, ...props }: StatusListSectionProps) {
  return (
    <section className={cls.section} {...props}>
      {children}
    </section>
  );
};

// Use to wrap multiple StatusList.Section components
StatusList.Wrapper = function StatusListWrapper({ children }: { children: React.ReactNode }) {
  return <div className={cls.wrapper}>{children}</div>;
};
