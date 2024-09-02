import * as React from "react";

import { IconCross } from "@kiesraad/icon";
import { AlertType, IconButton, renderIconForType } from "@kiesraad/ui";
import { cn } from "@kiesraad/util";

import cls from "./Alert.module.css";

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
          icon={<IconCross />}
          title="Melding sluiten"
          variant="ghost"
          size="lg"
          onClick={onClose}
        />
      )}
      <aside>{renderIconForType(type)}</aside>
      <section>{children}</section>
    </div>
  );
}
