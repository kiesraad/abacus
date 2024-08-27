import { IconCornerDownLeft } from "@kiesraad/icon";
import { cn } from "@kiesraad/util";

import cls from "./KeyboardKey.module.css";

export function Enter() {
  return (
    <div className={cn(cls["keyboard-key"])}>
      <span>Enter</span>
      <IconCornerDownLeft />
    </div>
  );
}
