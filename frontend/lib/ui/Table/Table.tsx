import * as React from "react";
import { To, useNavigate } from "react-router-dom";

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

function Header({ children, backgroundStyling }: { children: React.ReactNode[]; backgroundStyling?: boolean }) {
  return (
    <thead>
      <tr className={backgroundStyling ? cls.backgroundStyling : undefined}>{children}</tr>
    </thead>
  );
}

function Column({ children, width }: { children: React.ReactNode; width?: string }) {
  return (
    <th className="fs-xs" style={width ? { width } : undefined}>
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

function LinkRow({ children, to }: { children: React.ReactNode[]; to: To }) {
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

function Cell({
  children,
  number,
  fontSizeClass,
}: {
  children?: React.ReactNode;
  number?: boolean;
  fontSizeClass: string;
}) {
  return <td className={`${number ? `${cls.number} ` : ""}${fontSizeClass}`}>{children}</td>;
}
