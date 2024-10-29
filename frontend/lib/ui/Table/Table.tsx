import * as React from "react";
import { useNavigate } from "react-router-dom";

import cls from "./Table.module.css";

export interface TableProps {
  id?: string;
  children?: React.ReactNode;
}

export function Table({ id, children }: TableProps) {
  return (
    <table id={id} className={cls["table"]}>
      {children}
    </table>
  );
}

Table.Header = ({ children }: { children: React.ReactNode[] }) => (
  <thead>
    <tr>{children}</tr>
  </thead>
);

Table.Column = ({ children, number, width }: { children: React.ReactNode; number?: boolean; width?: string }) => (
  <th className={number ? cls["number"] : undefined} style={width ? { width } : undefined}>
    {children}
  </th>
);

Table.Body = ({ children }: { children: React.ReactNode[] }) => <tbody>{children}</tbody>;

Table.Row = ({ children }: { children: React.ReactNode[] }) => <tr>{children}</tr>;

Table.LinkRow = ({ children, to }: { children: React.ReactNode[]; to: string }) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const navigate = useNavigate();

  function handleClick() {
    navigate(to);
  }

  return (
    <tr className={cls["row-link"]} onClick={handleClick}>
      {children}
    </tr>
  );
};

Table.Cell = ({ children, number }: { children?: React.ReactNode; number?: boolean }) => (
  <td className={number ? cls["number"] : undefined}>{children}</td>
);
