import * as React from "react";

import { cn } from "@kiesraad/util";

import { Size } from "../ui.types";
import cls from "./Icon.module.css";

export interface IconProps {
  icon: React.ReactNode;
  size?: Size;
  color?: "primary" | "warning" | "error";
  spacing?: number;
}

export function Icon({ icon, size = "md", color = "primary" }: IconProps) {
  return (
    <div className={cn(cls.icon, cls[size], cls[color])} role="img">
      {icon}
    </div>
  );
}
