import * as React from "react";

import cls from "./inputgrid.module.css";
import { cn, domtoren } from "@kiesraad/util";

export interface InputGridProps {
  zebra?: boolean;
  focusIds?: string[];
  currentFocusId?: string;
  children: React.ReactNode;
}

type InputEntry = {
  el: HTMLInputElement;
  active?: boolean;
};

export function InputGrid({ zebra, children }: InputGridProps) {
  const ref = React.useRef<HTMLTableElement>(null);
  const lastFocused = React.useRef<HTMLElement | null>(null);
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

    inputList.current[activeIndex].el.blur();
    inputList.current[targetIndex].el.focus();
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

  const handleFocus = (event: FocusEvent) => {
    // Handle focus event
    if (event.target) {
      const el = event.target as HTMLElement;
      const entry = inputList.current.find((input) => input.el === el);
      if (entry) {
        inputList.current.forEach((input) => (input.active = false));
        entry.active = true;
      }

      const trEl = domtoren(el).closest("tr").toggleClass("focused").el();
      if (lastFocused.current) {
        domtoren(lastFocused.current).toggleClass("focused");
      }
      lastFocused.current = trEl as HTMLElement;
    }
  };

  React.useLayoutEffect(() => {
    const tableEl = ref.current;
    if (tableEl) {
      tableEl.querySelectorAll("input").forEach((input) => {
        inputList.current.push({ el: input });
        input.addEventListener("focus", handleFocus);
      });

      return () => {
        if (tableEl) {
          tableEl.querySelectorAll("input").forEach((input) => {
            input.removeEventListener("focus", handleFocus);
          });
        }
      };
    }
  }, []);

  return (
    <table ref={ref} className={cn(cls.inputgrid, { zebra: zebra })}>
      {children}
    </table>
  );
}

InputGrid.Header = ({ children }: { children: [React.ReactElement, React.ReactElement, React.ReactElement] }) => (
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
InputGrid.Row = ({ children }: { children: [React.ReactElement, React.ReactElement, React.ReactElement] }) => (
  <tr>{children}</tr>
);
