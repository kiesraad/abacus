import * as React from "react";

import { IconArrowBlockUp, IconCornerDownLeft } from "@kiesraad/icon";
import { cn } from "@kiesraad/util";

import { KeyboardKey } from "../ui.types";
import cls from "./KeyboardKeys.module.css";

export interface KeyboardKeysProps {
  keys: KeyboardKey[];
}

function renderKey(keyboardKey: KeyboardKey, index: number): React.JSX.Element {
  switch (keyboardKey) {
    case "enter":
      return (
        <kbd key={index}>
          <span>Enter</span>
          <IconCornerDownLeft />
        </kbd>
      );
    case "shift":
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
