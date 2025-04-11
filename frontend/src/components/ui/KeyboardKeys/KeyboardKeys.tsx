import * as React from "react";

import { cn } from "@/lib/util/classnames";

import { IconArrowBlockUp, IconArrowNarrowDown, IconArrowNarrowUp, IconCornerDownLeft } from "@kiesraad/icon";
import { KeyboardKey } from "@kiesraad/ui";

import cls from "./KeyboardKeys.module.css";

export interface KeyboardKeysProps {
  keys: KeyboardKey[];
}

function renderKey(keyboardKey: KeyboardKey, index: number): React.JSX.Element {
  switch (keyboardKey) {
    case KeyboardKey.Enter:
      return (
        <kbd key={index}>
          <span>Enter</span>
          <IconCornerDownLeft />
        </kbd>
      );
    case KeyboardKey.Shift:
      return (
        <kbd key={index}>
          <IconArrowBlockUp />
          <span>Shift</span>
        </kbd>
      );
    case KeyboardKey.Down:
      return (
        <kbd key={index}>
          <IconArrowNarrowDown />
        </kbd>
      );
    case KeyboardKey.Up:
      return (
        <kbd key={index}>
          <IconArrowNarrowUp />
        </kbd>
      );
    default:
      return <></>;
  }
}

export function KeyboardKeys({ keys }: KeyboardKeysProps) {
  return <div className={cn(cls.keyboardKeys)}>{keys.map((keyboardKey, index) => renderKey(keyboardKey, index))}</div>;
}

KeyboardKeys.HintText = function KeyboardKeysHintText({ children }: { children: React.ReactNode }) {
  return <div className={cls.keyboardKeysHintText}>{children}</div>;
};
