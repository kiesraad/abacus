import type { PropsWithChildren } from "react";

import cls from "./Badge.module.css";

interface PollingStationNumberProps extends PropsWithChildren {
  size?: "sm" | "md";
}

export function PollingStationNumber({ children, size = "md" }: PollingStationNumberProps) {
  return <div className={`${cls.polling_station} ${cls[size]}`}>{children}</div>;
}
