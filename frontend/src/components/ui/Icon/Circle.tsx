import type { Size } from "@/types/ui";
import { cn } from "@/utils/classnames";

import type { ProgressBarColorClass } from "../ProgressBar/ProgressBar";
import cls from "./Circle.module.css";

export interface CircleProps {
  size?: "xxs" | Size;
  color?: "primary" | "warning" | "error" | "accept" | ProgressBarColorClass;
}

export function Circle({ size = "md", color = "primary" }: CircleProps) {
  return <div className={cn(cls.circle, cls[size], cls[color])}></div>;
}
