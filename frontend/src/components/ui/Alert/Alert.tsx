import * as React from "react";

import { cn } from "@/lib/util/classnames";
import { AlertType } from "@/types/ui";

import { t } from "@kiesraad/i18n";
import { IconCross } from "@kiesraad/icon";
import { IconButton } from "@kiesraad/ui";

import { AlertIcon } from "../Icon/AlertIcon";
import cls from "./Alert.module.css";

export interface AlertProps {
  title?: string;
  type: AlertType;
  variant?: "default" | "no-icon";
  inline?: boolean;
  small?: boolean;
  margin?: "mb-md" | "mb-md-lg" | "mb-lg";
  children: React.ReactNode;
  onClose?: () => void;
}

export function Alert({
  type,
  onClose,
  children,
  margin,
  small = false,
  title,
  inline,
  variant = "default",
}: AlertProps) {
  const id = React.useId();
  return (
    <div
      className={cn(inline ? cls.inlineAlert : cls.alert, cls[type], margin, variant, small ? "small" : undefined)}
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
