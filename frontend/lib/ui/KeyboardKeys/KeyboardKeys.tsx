import * as React from "react";

import { cn } from "@kiesraad/util";

import { KeyboardKey } from "../ui.types";
import { Enter } from "./Enter";
import cls from "./KeyboardKeys.module.css";
import { Shift } from "./Shift";

export interface KeyboardKeysProps {
  keys: KeyboardKey[];
}

function renderKey(key: KeyboardKey): React.JSX.Element {
  switch (key) {
    case "enter":
      return <Enter />;
    case "shift":
      return <Shift />;
    default:
      return <></>;
  }
}

export function KeyboardKeys({ keys }: KeyboardKeysProps) {
  return <div className={cn(cls["keyboard-keys"])}>{keys.map((key) => renderKey(key))}</div>;
}
