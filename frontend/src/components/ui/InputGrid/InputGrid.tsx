import { ReactNode, useRef } from "react";

import { cn } from "@/utils/classnames";

import cls from "./InputGrid.module.css";

export type InputGridRowCells = [ReactNode, ReactNode, ReactNode];

export interface InputGridProps {
  zebra?: boolean;
  children: React.ReactNode;
}

export function InputGrid({ zebra, children }: InputGridProps) {
  const ref = useRef<HTMLTableElement>(null);

  return (
    <table role="none" ref={ref} className={cn(cls.inputGrid, zebra && cls.zebra)}>
      {children}
    </table>
  );
}

InputGrid.Header = ({ children }: { children: InputGridRowCells }) => (
  <thead>
    <tr>{children}</tr>
  </thead>
);

InputGrid.Body = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>;

InputGrid.Separator = () => (
  <tr className={cls.separator}>
    <td colSpan={3} />
  </tr>
);

InputGrid.Row = ({
  children,
  isTotal,
  addSeparator,
  id,
}: {
  children: InputGridRowCells;
  isTotal?: boolean;
  addSeparator?: boolean;
  id?: string;
}) => (
  <>
    <tr className={cn(isTotal && cls.total)} id={`row-${id}`}>
      {children}
    </tr>
    {addSeparator && <InputGrid.Separator />}
  </>
);

InputGrid.ListTotal = ({ children, id }: { children: InputGridRowCells; id?: string }) => (
  <>
    <tr className={cls.totalSeparator}>
      <td className={cls.field}></td>
      <td className={cls.value}></td>
      <td className={cls.title}></td>
    </tr>
    <tr className={cn(cls.listTotal, cls.total)} id={`row-${id}`}>
      {children}
    </tr>
  </>
);
