import * as React from "react";
import { To, useNavigate } from "react-router";

import { Fraction } from "@/types/generated/openapi";
import { cn } from "@/utils/classnames";
import { getFractionInteger, getFractionWithoutInteger } from "@/utils/fraction";

import cls from "./Table.module.css";

export type TableProps = React.TableHTMLAttributes<HTMLTableElement>;

export function Table({ children, className, ...props }: TableProps) {
  return (
    <table className={cn(cls.table, className)} {...props}>
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
Table.DisplayFractionCells = DisplayFractionCells;

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
  className,
}: {
  children?: React.ReactNode;
  scope?: "col" | "row";
  span?: number;
  className?: string;
}) {
  return (
    <th
      scope={scope || "col"}
      rowSpan={scope === "row" ? span : undefined}
      colSpan={scope !== "row" ? span : undefined}
      className={className}
    >
      {children}
    </th>
  );
}

function Body({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tbody className={className}>{children}</tbody>;
}

function Row({
  id,
  children,
  increasedPadding,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  increasedPadding?: boolean;
  className?: string;
}) {
  return (
    <tr id={id} className={cn(increasedPadding && cls.increasedPadding, className)}>
      {children}
    </tr>
  );
}

function ClickRow({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <tr className={cn(cls.rowLink, className)} onClick={onClick}>
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

function DisplayFractionCells({ children, className }: { children: Fraction | undefined; className?: string }) {
  return (
    <>
      <td className={cn(cls.integerCell, "font-number", className)}>{children && getFractionInteger(children)}</td>
      <td className={cn(cls.fractionCell, "font-number", className)}>
        {children && getFractionWithoutInteger(children)}
      </td>
    </>
  );
}
