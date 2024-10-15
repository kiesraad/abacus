import { ReactElement } from "react";

import { type PollingStationStatus } from "@kiesraad/api";
import { IconPencil } from "@kiesraad/icon";

import { Icon } from "../Icon/Icon";
import classes from "./badge.module.css";

const typeToLabel: { [S in PollingStationStatus]: { label: string; icon?: ReactElement } } = {
  first_entry: { label: "1e invoer" },
  definitive: { label: "Definitief" },
  first_entry_in_progress: { label: "1e invoer", icon: <Icon size="sm" icon={<IconPencil />} /> },
};

export interface BadgeProps {
  type: keyof typeof typeToLabel;
  showIcon?: boolean;
}

export function Badge({ type, showIcon = false }: BadgeProps) {
  const { label, icon } = typeToLabel[type];
  return (
    <div className={`${classes[type]} ${classes.badge}`}>
      {label}
      {showIcon && icon}
    </div>
  );
}
