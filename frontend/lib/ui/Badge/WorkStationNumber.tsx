import classes from "./badge.module.css";

export function WorkStationNumber({ children }: React.PropsWithChildren) {
  return <div className={classes.workstation}>{children}</div>;
}
