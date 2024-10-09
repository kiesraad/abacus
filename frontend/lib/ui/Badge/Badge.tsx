import { ReactElement } from "react";

import { type PollingStationStatus } from "@kiesraad/api";
import { IconPencil } from "@kiesraad/icon";

import { Icon } from "../Icon/Icon";
import classes from "./badge.module.css";

const typeToLabel: { [S in PollingStationStatus]: string | ReactElement } = {
  first_entry: "1e invoer",
  definitive: "Definitief",
  first_entry_in_progress: (
    <>
      1e invoer <Icon icon={<IconPencil />} />
    </>
  ),
};

export interface BadgeProps {
  type: keyof typeof typeToLabel;
}

export function Badge({ type }: BadgeProps) {
  return <div className={`${classes[type]} ${classes.badge}`}>{typeToLabel[type]}</div>;
}
