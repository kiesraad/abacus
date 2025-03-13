import * as React from "react";

import { t } from "@kiesraad/i18n";
import { AlertType, IconButton, renderIconForType } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import { IconCross } from "@/components/generated/icons";

import cls from "./Alert.module.css";

export interface AlertProps {
  type: AlertType;
  variant?: "default" | "small" | "no-icon";
  margin?: "mb-md" | "mb-md-lg" | "mb-lg";
  children: React.ReactNode;
  onClose?: () => void;
}

export function Alert({ type, onClose, children, margin, variant = "default" }: AlertProps) {
  return (
    <div className={`${cn(cls.alert, cls[type], variant)} ${margin}`} role="alert">
      {onClose && (
        <IconButton icon={<IconCross />} title={t("close_message")} variant="tertiary" size="lg" onClick={onClose} />
      )}
      {variant !== "no-icon" && <aside>{renderIconForType(type)}</aside>}
      <section>{children}</section>
    </div>
  );
}
