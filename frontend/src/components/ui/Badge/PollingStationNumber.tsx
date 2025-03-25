import * as React from "react";

import cls from "./Badge.module.css";

export function PollingStationNumber({ children }: React.PropsWithChildren) {
  return <div className={cls.pollingstation}>{children}</div>;
}
