import * as React from "react";

import { IconCross } from "@/components/generated/icons";
import { t } from "@/i18n/translate";
import { AlertType } from "@/types/ui";
import { cn } from "@/utils/classnames";

import { AlertIcon } from "../Icon/AlertIcon";
import { IconButton } from "../IconButton/IconButton";
import cls from "./Alert.module.css";

export interface AlertProps {
  title?: string;
  type: AlertType;
  variant?: "default" | "no-icon";
  inline?: boolean;
  small?: boolean;
  margin?: "mb-0" | "mb-sm" | "mb-md" | "mb-md-lg" | "mb-lg";
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
      className={cn(inline ? cls.inlineAlert : cls.alert, cls[type], margin, variant, { small })}
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
          {title && <strong className="heading-md">{title}</strong>}
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
