import * as React from "react";

import cls from "./InputGrid.module.css";
import { cn, domtoren } from "@kiesraad/util";

export interface InputGridProps {
  zebra?: boolean;
  focusIds?: string[];
  currentFocusId?: string;
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
      const entry = inputList.current.find((input) => input.el === el);
      if (entry) {
        entry.active = true;
        domtoren(entry.trEl).addClass("focused");
      }
    }
  }, []);

  const handleBlur = React.useCallback((event: FocusEvent) => {
    if (event.target) {
      const el = event.target as HTMLElement;
      const entry = inputList.current.find((input) => input.el === el);
      if (entry) {
        entry.active = false;
        domtoren(entry.trEl).removeClass("focused");
      }
    }
  }, []);

  React.useLayoutEffect(() => {
    const tableEl = ref.current;
    if (tableEl) {
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
InputGrid.Seperator = () => (
  <tr>
    <td className="sep" colSpan={3}></td>
  </tr>
);
InputGrid.Row = ({
  children,
  isTotal,
}: {
  children: [React.ReactElement, React.ReactElement, React.ReactElement];
  isTotal?: boolean;
}) => <tr className={isTotal ? "is-total" : undefined}>{children}</tr>;
