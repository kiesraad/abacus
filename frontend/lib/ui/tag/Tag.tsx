import * as React from "react";
import cls from "./tag.module.css";

export interface TagProps {
  type?: "default";
  children: React.ReactNode;
}

export function Tag({ type = "default", children }: TagProps) {
  return <div className={`${cls.tag || ""} ${type}`}>{children}</div>;
}
