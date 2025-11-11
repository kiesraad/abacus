import { ReactElement } from "react";

import { IconEdit } from "@/components/generated/icons";
import { t } from "@/i18n/translate";
import { type DataEntryStatusName } from "@/types/generated/openapi";

import { Icon } from "../Icon/Icon";
import cls from "./Badge.module.css";

const typeToLabel: { [S in DataEntryStatusName]: { label: string; icon?: ReactElement } } = {
  first_entry_not_started: { label: t("data_entry.first_entry") },
  first_entry_in_progress: { label: t("data_entry.first_entry"), icon: <Icon size="sm" icon={<IconEdit />} /> },
  first_entry_has_errors: { label: t("data_entry.first_entry") },
  second_entry_not_started: { label: t("data_entry.second_entry") },
  second_entry_in_progress: { label: t("data_entry.second_entry"), icon: <Icon size="sm" icon={<IconEdit />} /> },
  entries_different: { label: t("data_entry.second_entry") },
  definitive: { label: t("data_entry.definitive") },
};

export interface BadgeProps {
  type: keyof typeof typeToLabel;
  showIcon?: boolean;
  readOnlyStatus?: boolean;
}

export function Badge({ type, showIcon = false, readOnlyStatus = false }: BadgeProps) {
  let { label, icon } = typeToLabel[type];

  // Show first entry status on detail page when second entry has not started yet.
  // Otherwise, this would show the label for second entry, even though you're viewing the first entry.
  if (type == "second_entry_not_started" && readOnlyStatus) {
    label = t("data_entry.first_entry");
    icon = undefined;
  }

  return (
    <div className={`${cls[type]} ${cls.badge}`}>
      {label}
      {showIcon && icon}
    </div>
  );
}
