import { type PollingStationStatus } from "@kiesraad/api";

import classes from "./badge.module.css";

const typeToTextDict: { [S in PollingStationStatus]: string } = {
  first_entry: "1e invoer",
  definitive: "Definitief",
  /*
  difference: "Verschil invoer 1 en 2",
  extra_entry: "Extra invoer",
  correction: "Corrigendum",
  objections: "Bezwaren",
  second_entry: "2e invoer",
   */
};

export interface BadgeProps {
  type: keyof typeof typeToTextDict;
}

export function Badge({ type }: BadgeProps) {
  return <div className={`${classes[type]} ${classes.badge}`}>{typeToTextDict[type]}</div>;
}
