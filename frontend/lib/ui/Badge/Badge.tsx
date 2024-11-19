import { ReactElement } from "react";

import { type PollingStationStatus } from "@kiesraad/api";
import { IconPencil } from "@kiesraad/icon";

import { Icon } from "../Icon";
import cls from "./Badge.module.css";

const typeToLabel: { [S in PollingStationStatus]: { label: string; icon?: ReactElement } } = {
  not_started: { label: "1e invoer" },
  first_entry_in_progress: { label: "1e invoer", icon: <Icon size="sm" icon={<IconPencil />} /> },
  first_entry_unfinished: { label: "1e invoer", icon: <Icon size="sm" icon={<IconPencil />} /> },
  second_entry: { label: "2e invoer" },
  second_entry_in_progress: { label: "2e invoer", icon: <Icon size="sm" icon={<IconPencil />} /> },
  second_entry_unfinished: { label: "2e invoer", icon: <Icon size="sm" icon={<IconPencil />} /> },
  definitive: { label: "Definitief" },
};

export interface BadgeProps {
  type: keyof typeof typeToLabel;
  showIcon?: boolean;
}

export function Badge({ type, showIcon = false }: BadgeProps) {
  const { label, icon } = typeToLabel[type];
  return (
    <div className={`${cls[type]} ${cls.badge}`}>
      {label}
      {showIcon && icon}
    </div>
  );
}
