import * as React from "react";

import { ShortCut } from "../Shortcut/ShortcutHint";
import { Size, Variant } from "../ui.types";
import cls from "./Button.module.css";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isDisabled?: boolean;
  isLoading?: boolean;
  variant?: Variant;
  size?: Size;
  rightIcon?: React.ReactNode;
  keyboardShortcut?: ShortCut;
  children: React.ReactNode;
}

export function Button({
  isDisabled,
  isLoading,
  variant = "default",
  size = "md",
  rightIcon,
  keyboardShortcut,
  children,
  ...htmlButtonProps
}: ButtonProps) {
  const ref = React.useRef<HTMLButtonElement>(null);
  // const eventMatchesShortcut = React.useMemo(() => {
  //   if (!keyboardShortcut) return () => false;

  //   const keyCombination = keyboardShortcut.split("+");
  //   const key = keyCombination[keyCombination.length - 1];
  //   const modifierKeys = keyCombination.slice(0, -1);

  //   return (e: React.KeyboardEvent<HTMLButtonElement>) => {
  //     if (e.key !== key) return false;

  //     return modifierKeys.every((modifierKey) => {
  //       switch (modifierKey) {
  //         case "ctrl":
  //           return e.ctrlKey;
  //         case "shift":
  //           return e.shiftKey;
  //         case "alt":
  //           return e.altKey;
  //         default:
  //           return false;
  //       }
  //     });
  //   };
  // }, [keyboardShortcut]);

  // const onKeyDown = React.useCallback(
  //   (e: React.KeyboardEvent<HTMLButtonElement>) => {
  //     console.log("HUHH");
  //     if (eventMatchesShortcut(e)) {
  //       e.currentTarget.click();
  //     }
  //   },
  //   [eventMatchesShortcut],
  // );

  React.useEffect(() => {
    if (!keyboardShortcut) return;

    const eventMatchesShortcut = (e: KeyboardEvent) => {
      const keyCombination = keyboardShortcut.split("+");
      const key = keyCombination[keyCombination.length - 1];
      const modifierKeys = keyCombination.slice(0, -1);

      if (e.key !== key) return false;

      return modifierKeys.every((modifierKey) => {
        switch (modifierKey) {
          case "Control":
            return e.ctrlKey;
          case "Shift":
            return e.shiftKey;
          case "Alt":
            return e.altKey;
          default:
            return false;
        }
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (eventMatchesShortcut(e)) {
        ref.current?.click();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [keyboardShortcut]);

  return (
    <button
      className={`${cls["button"] || ""} ${cls[variant] || ""} ${cls[size] || ""}`}
      disabled={isDisabled || isLoading}
      ref={ref}
      {...htmlButtonProps}
    >
      {children}
      {rightIcon}
    </button>
  );
}
