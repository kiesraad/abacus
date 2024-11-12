import cls from "./Badge.module.css";

export function WorkStationNumber({ children }: React.PropsWithChildren) {
  return <div className={cls.workstation}>{children}</div>;
}
