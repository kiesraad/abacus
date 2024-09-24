import * as React from "react";
import { createPortal } from "react-dom";

import { IconCross } from "@kiesraad/icon";
import { IconButton } from "@kiesraad/ui";

import cls from "./Modal.module.css";

export interface ModalProps {
  id: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export function Modal({ id, onClose, children }: ModalProps): React.ReactNode {
  const modalRoot = document.body;

  React.useEffect(() => {
    document.getElementById(id)?.focus();
  }, [id]);

  return createPortal(
    <div className={cls.modal} role="dialog">
      <div className={cls["modal-container"]}>
        {onClose && (
          // TODO: How to make sure thus button can focus with keyboard?
          <IconButton onClick={onClose} icon={<IconCross />} title="Melding sluiten" size="lg" variant="ghost" />
        )}
        <div className={cls["modal-body"]}>{children}</div>
      </div>
    </div>,
    modalRoot,
  );
}
