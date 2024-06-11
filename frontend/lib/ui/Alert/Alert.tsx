import * as React from "react";
import { AlertType } from "../ui.types";
import cls from "./Alert.module.css";
import { cn } from "@kiesraad/util";
import { IconButton } from "@kiesraad/ui";
import { IconCross, IconError, IconThumbsup, IconWarning, IconInfo } from "@kiesraad/icon";

export interface AlertProps {
  type: AlertType;
  children: React.ReactNode;
  onClose?: () => void;
}

export function Alert({ type, onClose, children }: AlertProps) {
  return (
    <div className={cn(cls.alert, cls[type])} role="alert">
      {onClose && (
        <IconButton
          title="close"
          icon={<IconCross />}
          variant="ghost"
          size="lg"
          isRound
          onClick={onClose}
        />
      )}
      <aside>{renderIconForType(type)}</aside>
      <section>{children}</section>
    </div>
  );
}

function renderIconForType(type: AlertType) {
  switch (type) {
    case "error":
      return <IconError />;
    case "warning":
      return <IconWarning />;
    case "notify":
      return <IconInfo />;
    case "success":
      return <IconThumbsup />;
  }
}
