import { ReactElement } from "react";

import { type DataEntryStatusName } from "@/api/gen/openapi";
import { IconPencil } from "@/components/generated/icons";

import { t } from "@kiesraad/i18n";

import { Icon } from "../Icon/Icon";
import cls from "./Badge.module.css";

const typeToLabel: { [S in DataEntryStatusName]: { label: string; icon?: ReactElement } } = {
  first_entry_not_started: { label: t("data_entry.first_entry") },
  first_entry_in_progress: { label: t("data_entry.first_entry"), icon: <Icon size="sm" icon={<IconPencil />} /> },
  second_entry_not_started: { label: t("data_entry.second_entry") },
  second_entry_in_progress: { label: t("data_entry.second_entry"), icon: <Icon size="sm" icon={<IconPencil />} /> },
  entries_different: { label: t("data_entry.entries_different") },
  definitive: { label: t("data_entry.definitive") },
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
