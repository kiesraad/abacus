import { type PollingStationStatus } from "@kiesraad/api";

import classes from "./badge.module.css";

const typeToTextDict: { [S in PollingStationStatus]: string } = {
  first_entry: "1e invoer",
  definitive: "Definitief",
  first_entry_in_progress: "1e invoer bezig",
};

export interface BadgeProps {
  type: keyof typeof typeToTextDict;
}

export function Badge({ type }: BadgeProps) {
  return <div className={`${classes[type]} ${classes.badge}`}>{typeToTextDict[type]}</div>;
}
