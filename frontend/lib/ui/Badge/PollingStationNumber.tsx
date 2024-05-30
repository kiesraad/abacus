import * as React from "react";
import classes from "./badge.module.css";

export function PollingStationNumber({ children }: React.PropsWithChildren) {
  return <div className={classes.pollingstation}>{children}</div>;
}
