import { cn } from "@/lib/util/classnames";
import { Size } from "@/types/ui";

import { ProgressBarColorClass } from "@kiesraad/ui";

import cls from "./Circle.module.css";

export interface CircleProps {
  size?: "xxs" | Size;
  color?: "primary" | "warning" | "error" | "accept" | ProgressBarColorClass;
}

export function Circle({ size = "md", color = "primary" }: CircleProps) {
  return <div className={cn(cls.circle, cls[size], cls[color])}></div>;
}
