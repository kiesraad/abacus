import * as React from "react";
import { To, useNavigate } from "react-router-dom";

import { cn } from "@kiesraad/util";

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
Table.NumberCell = NumberCell;

function Header({ children, className }: { children: React.ReactNode[]; className?: string }) {
  return (
    <thead>
      <tr className={className}>{children}</tr>
    </thead>
  );
}

function Column({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={className}>{children}</th>;
}

function Body({ children, className }: { children: React.ReactNode[]; className?: string }) {
  return <tbody className={className}>{children}</tbody>;
}

function Row({ children }: { children: React.ReactNode[] }) {
  return <tr>{children}</tr>;
}

function LinkRow({ children, to }: { children: React.ReactNode[]; to: To }) {
  const navigate = useNavigate();

  function handleClick() {
    void navigate(to);
  }

  return (
    <tr className={cls.rowLink} onClick={handleClick}>
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
