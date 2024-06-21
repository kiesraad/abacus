import * as React from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@kiesraad/ui";
import { IconCross } from "@kiesraad/icon";
import cls from "./Modal.module.css";

export interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ onClose, children }: ModalProps): React.ReactNode {
  const modalRoot = document.body;

  return createPortal(
    <div className={cls.modal} role="dialog">
      <div className={cls["modal-container"]}>
        <IconButton
          onClick={onClose}
          icon={<IconCross />}
          title="Melding sluiten"
          size="lg"
          variant="ghost"
        />
        <div className={cls["modal-body"]}>{children}</div>
      </div>
    </div>,
    modalRoot,
  );
}
