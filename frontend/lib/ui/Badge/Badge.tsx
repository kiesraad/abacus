import { ReactElement } from "react";

import { type DataEntryStatusName } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconPencil } from "@kiesraad/icon";

import { Icon } from "../Icon";
import cls from "./Badge.module.css";

const typeToLabel: { [S in DataEntryStatusName]: { label: string; icon?: ReactElement } } = {
  first_entry_not_started: { label: t("data_entry.first_entry") },
  first_entry_in_progress: { label: t("data_entry.first_entry"), icon: <Icon size="sm" icon={<IconPencil />} /> },
  second_entry_not_started: { label: t("data_entry.second_entry") },
  second_entry_in_progress: { label: t("data_entry.second_entry"), icon: <Icon size="sm" icon={<IconPencil />} /> },
  entries_not_equal: { label: t("data_entry.second_entry"), icon: <Icon size="sm" icon={<IconPencil />} /> },
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
