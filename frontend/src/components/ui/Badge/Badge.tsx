import type { ReactElement } from "react";

import { IconEdit } from "@/components/generated/icons";
import { t } from "@/i18n/translate";
import type { DataEntryStatusName } from "@/types/generated/openapi";

import { Icon } from "../Icon/Icon";
import cls from "./Badge.module.css";

const typeToLabel: { [T in DataEntryStatusName]: { label: string; icon?: ReactElement } } = {
  empty: { label: t("data_entry.first_entry") },
  first_entry_in_progress: { label: t("data_entry.first_entry"), icon: <Icon size="sm" icon={<IconEdit />} /> },
  first_entry_has_errors: { label: t("data_entry.first_entry") },
  first_entry_finalised: { label: t("data_entry.first_entry") },
  second_entry_in_progress: { label: t("data_entry.second_entry"), icon: <Icon size="sm" icon={<IconEdit />} /> },
  entries_different: { label: t("data_entry.second_entry") },
  definitive: { label: t("data_entry.definitive") },
};

export interface BadgeProps {
  id?: string;
  type: DataEntryStatusName;
  showIcon?: boolean;
}

export function Badge({ id, type, showIcon = false }: BadgeProps) {
  const { label, icon } = typeToLabel[type];
  return (
    <div id={id} className={`${cls[type]} ${cls.badge}`}>
      {label}
      {showIcon && icon}
    </div>
  );
}
