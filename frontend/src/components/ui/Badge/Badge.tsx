import type { ReactElement } from "react";

import { IconEdit } from "@/components/generated/icons";
import { t } from "@/i18n/translate";
import type { DataEntryStatusName, Role } from "@/types/generated/openapi";

import { Icon } from "../Icon/Icon";
import cls from "./Badge.module.css";

export type BadgeType = DataEntryStatusName | "first_entry_finalised_for_typist";

export interface LabelProps {
  label: string;
  icon?: ReactElement;
}

function typeToLabel(userRole: Role, badgeType: BadgeType): LabelProps {
  if (badgeType === "first_entry_finalised" && userRole === "typist") {
    badgeType = "first_entry_finalised_for_typist";
  }

  switch (badgeType) {
    case "empty":
      return { label: t("data_entry.first_entry") };
    case "first_entry_in_progress":
      return { label: t("data_entry.first_entry"), icon: <Icon size="sm" icon={<IconEdit />} /> };
    case "first_entry_has_errors":
      return { label: t("data_entry.first_entry") };
    case "first_entry_finalised":
      return { label: t("data_entry.first_entry") };
    case "first_entry_finalised_for_typist":
      return { label: t("data_entry.second_entry") };
    case "second_entry_in_progress":
      return { label: t("data_entry.second_entry"), icon: <Icon size="sm" icon={<IconEdit />} /> };
    case "entries_different":
      return { label: t("data_entry.second_entry") };
    case "definitive":
      return { label: t("data_entry.definitive") };
  }
}

export interface BadgeProps {
  id?: string;
  type: BadgeType;
  userRole: Role;
  showIcon?: boolean;
}

export function Badge({ id, type, userRole, showIcon = false }: BadgeProps) {
  const { label, icon } = typeToLabel(userRole, type);
  return (
    <div id={id} className={`${cls[type]} ${cls.badge}`}>
      {label}
      {showIcon && icon}
    </div>
  );
}
