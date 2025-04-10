import * as React from "react";

import { t } from "@kiesraad/i18n";
import { IconCross } from "@kiesraad/icon";
import { AlertType, IconButton, renderIconForType } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Alert.module.css";

export interface AlertProps {
  title?: string;
  type: AlertType;
  variant?: "default" | "small" | "no-icon";
  inline?: boolean;
  margin?: "mb-md" | "mb-md-lg" | "mb-lg";
  children: React.ReactNode;
  onClose?: () => void;
}

export function Alert({ type, onClose, children, margin, title, inline, variant = "default" }: AlertProps) {
  const id = React.useId();
  return (
    <div
      className={cn(inline ? cls.inlineAlert : cls.alert, cls[type], margin, variant)}
      role="alert"
      aria-describedby={id}
    >
      {onClose && (
        <IconButton icon={<IconCross />} title={t("close_message")} variant="tertiary" size="lg" onClick={onClose} />
      )}
      {inline ? (
        <header>
          {variant !== "no-icon" && <aside>{renderIconForType(type)}</aside>}
          {title && <h2>{title}</h2>}
        </header>
      ) : (
        variant !== "no-icon" && <aside>{renderIconForType(type)}</aside>
      )}
      <section id={id}>{children}</section>
    </div>
  );
}
