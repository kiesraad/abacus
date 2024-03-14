import * as React from "react";
import classes from "./tag.module.css";

export interface TagProps {
  type?: "default";
  children: React.ReactNode;
}

export function Tag({ type = "default", children }: TagProps) {
  return <div className={`${classes.tag} ${type}`}>{children}</div>;
}
