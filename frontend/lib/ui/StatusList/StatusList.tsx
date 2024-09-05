import * as React from "react";

import { MenuStatus } from "../ui.types";
import { renderStatusIcon } from "../util";
import cls from "./StatusList.module.css";

export function StatusList({ children }: { children: React.ReactNode }) {
  return <ul className={cls.list}>{children}</ul>;
}

export interface StatusListItemProps {
  status: MenuStatus;
  children: React.ReactNode;
}

StatusList.Item = function StatusListItem({ status, children }: StatusListItemProps) {
  return (
    <li className={status}>
      {renderStatusIcon(status)}
      {children}
    </li>
  );
};
