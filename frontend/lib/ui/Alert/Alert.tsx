import * as React from "react";
import { AlertType } from "../ui.types";
import cls from "./Alert.module.css";
import { cn } from "@kiesraad/util";
import { IconButton, renderIconForType } from "@kiesraad/ui";
import { IconCross } from "@kiesraad/icon";

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
          size="md"
          isRound
          onClick={onClose}
        />
      )}
      <aside>{renderIconForType(type)}</aside>
      <section>{children}</section>
    </div>
  );
}
