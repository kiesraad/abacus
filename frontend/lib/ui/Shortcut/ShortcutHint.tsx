import * as React from "react";

import { IconEnterKey, IconShiftKey } from "@kiesraad/icon";

import cls from "./ShortcutHint.module.css";

export type KeyboardModifierKey = "Control" | "Shift" | "Alt";
export type KeyboardKey = "Enter" | "Space" | "a" | "b";
export type ShortCut =
  | `${KeyboardKey}`
  | `${KeyboardModifierKey}+${KeyboardKey}`
  | `${KeyboardModifierKey}+${KeyboardModifierKey}+${KeyboardKey}`;

export interface ShortcutHintProps extends React.HTMLAttributes<HTMLDivElement> {
  shortcut: ShortCut;
}

export function ShortcutHint({ shortcut, ...divProps }: ShortcutHintProps) {
  const parts = shortcut.split("+") as (KeyboardKey | KeyboardModifierKey)[];

  return (
    <div className={cls.shortcuthint} {...divProps}>
      {parts.map((part) => (
        <kbd key={part} className={`key-${part}`}>
          {iconForKey(part)} {part}
        </kbd>
      ))}
    </div>
  );
}

function iconForKey(key: KeyboardKey | KeyboardModifierKey) {
  switch (key) {
    case "Control":
      return <span aria-label="control key">⌃</span>;
    case "Shift":
      return <IconShiftKey aria-label="shift key" />;
    case "Alt":
      return <span aria-label="alt key">⌥</span>;
    case "Enter":
      return <IconEnterKey aria-label="enter key" />;
    case "Space":
      return <span aria-label="space key">␣</span>;
    default:
      return "";
  }
}
