import * as React from "react";

import { cn } from "@kiesraad/util";

import { KeyboardKey } from "../ui.types";
import { Enter } from "./Enter";
import cls from "./KeyboardKeys.module.css";
import { Shift } from "./Shift";

export interface KeyboardKeysProps {
  keys: KeyboardKey[];
}

function renderKey(keyboardKey: KeyboardKey, index: number): React.JSX.Element {
  switch (keyboardKey) {
    case "enter":
      return <Enter key={index} />;
    case "shift":
      return <Shift key={index} />;
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
