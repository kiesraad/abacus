import * as React from "react";
import { To, useNavigate } from "react-router";

import { cn } from "@kiesraad/util";

import cls from "./Table.module.css";

export interface TableProps {
  id?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Table({ id, children, className }: TableProps) {
  return (
    <table id={id} className={cn(cls.table, className)}>
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
Table.NumberCell = NumberCell;

function Header({ children, className }: { children: React.ReactNode[]; className?: string }) {
  return (
    <thead>
      <tr className={className}>{children}</tr>
    </thead>
  );
}

function Column({
  children,
  scope,
  className,
}: {
  children?: React.ReactNode;
  scope?: "col" | "row";
  className?: string;
}) {
  return (
    <th scope={scope || "col"} className={className}>
      {children}
    </th>
  );
}

function Body({ children, className }: { children: React.ReactNode[]; className?: string }) {
  return <tbody className={className}>{children}</tbody>;
}

function Row({ children, className }: { children: React.ReactNode[]; className?: string }) {
  return <tr className={className}>{children}</tr>;
}

function LinkRow({ children, to, className }: { children: React.ReactNode[]; to: To; className?: string }) {
  const navigate = useNavigate();

  function handleClick() {
    void navigate(to);
  }

  return (
    <tr className={cn(cls.rowLink, className)} onClick={handleClick}>
      {children}
    </tr>
  );
}

function Cell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={className}>{children}</td>;
}

function NumberCell({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn(cls.numberCell, className)}>{children}</td>;
}
