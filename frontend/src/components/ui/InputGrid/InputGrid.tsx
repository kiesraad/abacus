import { ReactNode, useRef } from "react";

import { cn } from "@/utils/classnames";

import cls from "./InputGrid.module.css";

export interface InputGridProps {
  id?: string;
  zebra?: boolean;
  children: ReactNode;
}

export function InputGrid({ id, zebra, children }: InputGridProps) {
  const ref = useRef<HTMLTableElement>(null);

  return (
    <table id={id} role="none" ref={ref} className={cn(cls.inputGrid, zebra && cls.zebra)}>
      {children}
    </table>
  );
}

InputGrid.Header = ({
  field,
  previous,
  value,
  title,
}: {
  field: string;
  previous?: string;
  value: string;
  title: string;
}) => (
  <thead>
    <tr>
      <th className={cls.field}>{field}</th>
      {previous && <th className={cls.previous}>{previous}</th>}
      <th className={cls.value}>{value}</th>
      <th className={cls.title}>{title}</th>
    </tr>
  </thead>
);

InputGrid.Body = ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>;

InputGrid.Separator = ({ showPrevious }: { showPrevious?: boolean }) => (
  <tr className={cls.separator}>
    <td colSpan={showPrevious ? 4 : 3} />
  </tr>
);

InputGrid.Row = ({
  children,
  isTotal,
  addSeparator,
  id,
  showPrevious,
}: {
  children: ReactNode;
  isTotal?: boolean;
  addSeparator?: boolean;
  id?: string;
  showPrevious?: boolean;
}) => (
  <>
    <tr className={cn(isTotal && cls.total)} id={`row-${id}`}>
      {children}
    </tr>
    {addSeparator && <InputGrid.Separator showPrevious={showPrevious} />}
  </>
);

InputGrid.ListTotal = ({
  children,
  id,
  showPrevious,
}: {
  children: ReactNode;
  id?: string;
  showPrevious?: boolean;
}) => (
  <>
    <tr className={cls.totalSeparator}>
      <td className={cls.field}></td>
      {showPrevious && <td className={cls.previous}></td>}
      <td className={cls.value}></td>
      <td className={cls.title}></td>
    </tr>
    <tr className={cn(cls.listTotal, cls.total)} id={`row-${id}`}>
      {children}
    </tr>
  </>
);
