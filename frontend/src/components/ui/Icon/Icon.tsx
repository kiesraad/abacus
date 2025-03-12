import * as React from "react";

import { ProgressBarColorClass, Size } from "@/components/ui";
import { cn } from "@/utils";

import cls from "./Icon.module.css";

export interface IconProps {
  icon: React.ReactNode;
  size?: Size;
  color?: "primary" | "warning" | "error" | "accept" | ProgressBarColorClass;
  spacing?: number;
}

export function Icon({ icon, size = "md", color = "primary" }: IconProps) {
  return <div className={cn(cls.icon, cls[size], cls[color])}>{icon}</div>;
}
