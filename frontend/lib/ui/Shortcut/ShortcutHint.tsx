import * as React from "react";

import { IconEnterKey, IconShiftKey } from "@kiesraad/icon";

import cls from "./ShortcutHint.module.css";

export type KeyboardModifierKey = "ctrl" | "shift" | "alt";
export type KeyboardKey = "enter" | "space" | "a" | "b";
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
    case "ctrl":
      return <span aria-label="control key">⌃</span>;
    case "shift":
      return <IconShiftKey aria-label="shift key" />;
    case "alt":
      return <span aria-label="alt key">⌥</span>;
    case "enter":
      return <IconEnterKey aria-label="enter key" />;
    case "space":
      return <span aria-label="space key">␣</span>;
    default:
      return "";
  }
}
