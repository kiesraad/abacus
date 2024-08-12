import * as React from "react";

import { cn, domtoren } from "@kiesraad/util";

import cls from "./InputGrid.module.css";

export interface InputGridProps {
  zebra?: boolean;
  children: React.ReactNode;
}

type InputEntry = {
  el: HTMLInputElement;
  trEl: HTMLTableRowElement;
  active?: boolean;
};

export function InputGrid({ zebra, children }: InputGridProps) {
  const ref = React.useRef<HTMLTableElement>(null);
  const inputList = React.useRef<InputEntry[]>([]);

  const moveFocus = React.useCallback((dir: number) => {
    let activeIndex = inputList.current.findIndex((input) => input.active);
    if (activeIndex === -1) {
      activeIndex = 0;
    }
    let targetIndex = activeIndex + dir;
    if (targetIndex < 0) {
      targetIndex = inputList.current.length - 1;
    } else if (targetIndex >= inputList.current.length) {
      targetIndex = 0;
    }

    const cur = inputList.current[activeIndex];
    const next = inputList.current[targetIndex];

    if (cur && next) {
      cur.el.blur();
      next.el.focus();
      setTimeout(() => {
        next.el.select();
      }, 1);
    }
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
          moveFocus(-1);
          break;
        case "ArrowDown":
          moveFocus(1);
          break;
        case "Enter":
          moveFocus(1);
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moveFocus]);

  const handleFocus = React.useCallback((event: FocusEvent) => {
    // Handle focus event
    if (event.target) {
      const el = event.target as HTMLElement;
      const entry = inputList.current.find((input) => input.el.id === el.id);
      if (entry) {
        entry.active = true;
        domtoren(entry.trEl).addClass("focused");
      }
    }
  }, []);

  const handleBlur = React.useCallback((event: FocusEvent) => {
    if (event.target) {
      const el = event.target as HTMLElement;
      const entry = inputList.current.find((input) => input.el.id === el.id);
      if (entry) {
        entry.active = false;
        domtoren(entry.trEl).removeClass("focused");
      }
    }
  }, []);

  React.useEffect(() => {
    const tableEl = ref.current;
    if (tableEl) {
      inputList.current = [];
      tableEl.querySelectorAll("input").forEach((input) => {
        const trEl = domtoren(input).closest("tr").el() as HTMLTableRowElement;
        inputList.current.push({ el: input, trEl });
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
    <table ref={ref} className={cn(cls.inputgrid, { zebra: zebra })}>
      {children}
    </table>
  );
}

InputGrid.SectionTitle = ({
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
    <tr>
      {children[1]}
      {children[2]}
      {children[3]}
    </tr>
  </thead>
);

InputGrid.Header = ({
  children,
}: {
  children: [React.ReactElement, React.ReactElement, React.ReactElement];
}) => (
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
  isFocused,
  addSeparator,
  id,
}: {
  children: [React.ReactElement, React.ReactElement, React.ReactElement];
  isTotal?: boolean;
  isFocused?: boolean;
  addSeparator?: boolean;
  id?: string;
}) => (
  <>
    <tr className={(isTotal ? "is-total " : "") + (isFocused ? "focused" : "")} id={`row-${id}`}>
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
