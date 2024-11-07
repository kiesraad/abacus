import * as React from "react";
import { useNavigate } from "react-router-dom";

import cls from "./Table.module.css";

export interface TableProps {
  id?: string;
  children?: React.ReactNode;
}

export function Table({ id, children }: TableProps) {
  return (
    <table id={id} className={cls.table}>
      {children}
    </table>
  );
}

Table.Header = Header;
Table.Column = Column;
Table.Body = Body;
Table.Row = Row;
Table.LinkRow = LinkRow;
Table.Cell = Cell;

function Header({ children }: { children: React.ReactNode[] }) {
  return (
    <thead>
      <tr>{children}</tr>
    </thead>
  );
}

function Column({ children, number, width }: { children: React.ReactNode; number?: boolean; width?: string }) {
  return (
    <th className={number ? cls.number : undefined} style={width ? { width } : undefined}>
      {children}
    </th>
  );
}

function Body({ children }: { children: React.ReactNode[] }) {
  return <tbody>{children}</tbody>;
}

function Row({ children }: { children: React.ReactNode[] }) {
  return <tr>{children}</tr>;
}

function LinkRow({ children, to }: { children: React.ReactNode[]; to: string }) {
  const navigate = useNavigate();

  function handleClick() {
    navigate(to);
  }

  return (
    <tr className={cls.rowLink} onClick={handleClick}>
      {children}
    </tr>
  );
}

function Cell({ children, number }: { children?: React.ReactNode; number?: boolean }) {
  return <td className={number ? cls.number : undefined}>{children}</td>;
}
