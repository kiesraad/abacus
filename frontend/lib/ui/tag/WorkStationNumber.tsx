import classes from "./tag.module.css";

export function WorkStationNumber({ children }: React.PropsWithChildren) {
  return <div className={classes.workstation}>{children}</div>;
}
