import * as React from "react";

import { IconArrowBlockUp, IconCornerDownLeft } from "@kiesraad/icon";
import { KeyboardKey } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

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
    default:
      return <></>;
  }
}

export function KeyboardKeys({ keys }: KeyboardKeysProps) {
  return (
    <div className={cn(cls["keyboard-keys"])}>
      {keys.map((keyboardKey, index) => renderKey(keyboardKey, index))}
    </div>
  );
}
