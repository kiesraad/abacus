import * as React from "react";

import { cn, domtoren } from "@kiesraad/util";

import cls from "./InputGrid.module.css";

export interface InputGridProps {
  zebra?: boolean;
  children: React.ReactNode;
}

export function InputGrid({ zebra, children }: InputGridProps) {
  const ref = React.useRef<HTMLTableElement>(null);

  const handleFocus = React.useCallback((event: FocusEvent) => {
    // Handle focus event
    if (event.target) {
      const el = event.target as HTMLElement;
      const trEl = domtoren(el).closest("tr").el() as HTMLTableRowElement;
      domtoren(trEl).addClass("focused");
    }
  }, []);

  const handleBlur = React.useCallback((event: FocusEvent) => {
    if (event.target) {
      const el = event.target as HTMLElement;
      const trEl = domtoren(el).closest("tr").el() as HTMLTableRowElement;
      domtoren(trEl).removeClass("focused");
    }
  }, []);

  React.useEffect(() => {
    const tableEl = ref.current;
    if (tableEl) {
      tableEl.querySelectorAll("input").forEach((input) => {
        input.addEventListener("focus", handleFocus);
        input.addEventListener("blur", handleBlur);
      });

      return () => {
        tableEl.querySelectorAll("input").forEach((input) => {
          input.removeEventListener("focus", handleFocus);
          input.removeEventListener("blur", handleBlur);
        });
      };
    }
  }, [handleBlur, handleFocus]);

  return (
    <table ref={ref} className={cn(cls["input-grid"], { zebra: zebra })}>
      {children}
    </table>
  );
}

InputGrid.SectionTitleHeader = ({
  children,
}: {
  children: [React.ReactNode, React.ReactElement, React.ReactElement, React.ReactElement];
}) => (
  <thead>
    <tr>
      <th className={cn(cls.section_title)} colSpan={3}>
        {children[0]}
      </th>
    </tr>
    <tr>{children.slice(1)}</tr>
  </thead>
);

InputGrid.Header = ({ children }: { children: [React.ReactElement, React.ReactElement, React.ReactElement] }) => (
  <thead>
    <tr>{children}</tr>
  </thead>
);

InputGrid.Body = ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>;

InputGrid.Separator = () => (
  <tr className="sep_row">
    <td className="sep" colSpan={3}></td>
  </tr>
);

InputGrid.Row = ({
  children,
  isTotal,
  addSeparator,
  id,
}: {
  children: [React.ReactElement, React.ReactElement, React.ReactElement];
  isTotal?: boolean;
  addSeparator?: boolean;
  id?: string;
}) => (
  <>
    <tr className={isTotal ? "is-total " : ""} id={`row-${id}`}>
      {children}
    </tr>
    {addSeparator && <InputGrid.Separator />}
  </>
);

InputGrid.ListTotal = ({
  children,
  id,
}: {
  children: [React.ReactElement, React.ReactElement, React.ReactElement];
  id?: string;
}) => (
  <>
    <tr className="sep_total" id={`row-${id}`}>
      <td></td>
      <td></td>
      <td></td>
    </tr>
    <tr className="list_total is-total">{children}</tr>
  </>
);
