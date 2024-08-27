import { IconArrowBlockUp } from "@kiesraad/icon";
import { cn } from "@kiesraad/util";

import cls from "./KeyboardKey.module.css";

export function Shift() {
  return (
    <div className={cn(cls["keyboard-key"])}>
      <IconArrowBlockUp />
      <span>Shift</span>
    </div>
  );
}
