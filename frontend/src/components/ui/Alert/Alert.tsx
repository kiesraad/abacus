import * as React from "react";

import { t } from "@/lib/i18n";
import { IconCross } from "@/lib/icon";
import { cn } from "@/lib/util/classnames";
import { AlertType } from "@/types/ui";

import { AlertIcon } from "../Icon/AlertIcon";
import { IconButton } from "../IconButton/IconButton";
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
          {variant !== "no-icon" && (
            <aside>
              <AlertIcon type={type} />
            </aside>
          )}
          {title && <h2>{title}</h2>}
        </header>
      ) : (
        variant !== "no-icon" && (
          <aside>
            <AlertIcon type={type} />
          </aside>
        )
      )}
      <section id={id}>{children}</section>
    </div>
  );
}
