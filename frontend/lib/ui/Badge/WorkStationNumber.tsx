import { PropsWithChildren } from "react";

import cls from "./Badge.module.css";

export function WorkStationNumber({ children }: PropsWithChildren) {
  return <div className={cls.workstation}>{children}</div>;
}
