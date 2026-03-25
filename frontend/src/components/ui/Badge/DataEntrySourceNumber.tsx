import type { PropsWithChildren } from "react";

import cls from "./Badge.module.css";

interface DataEntrySourceNumberProps extends PropsWithChildren {
  size?: "sm" | "md";
}

export function DataEntrySourceNumber({ children, size = "md" }: DataEntrySourceNumberProps) {
  return <div className={`${cls.data_entry_source_number} ${cls[size]}`}>{children}</div>;
}
