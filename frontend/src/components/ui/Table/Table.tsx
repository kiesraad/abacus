import * as React from "react";
import { To, useNavigate } from "react-router";

import { cn } from "@/utils/classnames";

import cls from "./Table.module.css";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  variant?: "default" | "information";
}

export function Table({ variant = "default", children, className, ...props }: TableProps) {
  return (
    <table className={cn(cls.table, cls[`${variant}Variant`], className)} {...props}>
      {children}
    </table>
  );
}

Table.Header = Header;
Table.HeaderCell = HeaderCell;
Table.Body = Body;
Table.Row = Row;
Table.LinkRow = LinkRow;
Table.ClickRow = ClickRow;
Table.TotalRow = TotalRow;
Table.Cell = Cell;
Table.NumberCell = NumberCell;

function Header({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <thead>
      <tr className={className}>{children}</tr>
    </thead>
  );
}

function HeaderCell({
  children,
  scope,
  span,
  numberWidth,
  className,
}: {
  children?: React.ReactNode;
  scope?: "col" | "row";
  span?: number;
  numberWidth?: boolean;
  className?: string;
}) {
  return (
    <th
      scope={scope || "col"}
      rowSpan={scope === "row" ? span : undefined}
      colSpan={scope !== "row" ? span : undefined}
      className={cn(numberWidth && cls.numberWidth, className)}
    >
      {children}
    </th>
  );
}

function Body({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tbody className={className}>{children}</tbody>;
}

function Row({ id, children, className }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <tr id={id} className={className}>
      {children}
    </tr>
  );
}

function ClickRow({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <tr className={cn(cls.rowLink, active && cls.active, className)} onClick={onClick}>
      {children}
    </tr>
  );
}

function LinkRow({
  id,
  children,
  to,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  to: To;
  className?: string;
}) {
  const navigate = useNavigate();

  function handleClick() {
    void navigate(to);
  }

  return (
    <tr id={id} className={cn(cls.rowLink, className)} onClick={handleClick}>
      {children}
    </tr>
  );
}

function TotalRow({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <tr className={cn(cls.rowTotal, className)}>{children}</tr>;
}

function Cell({ children, colSpan, className }: { children?: React.ReactNode; colSpan?: number; className?: string }) {
  return (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  );
}

function NumberCell({
  children,
  colSpan,
  className,
}: {
  children?: React.ReactNode;
  colSpan?: number;
  className?: string;
}) {
  return (
    <td colSpan={colSpan} className={cn(cls.numberCell, className)}>
      {children}
    </td>
  );
}
