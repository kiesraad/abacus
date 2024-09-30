import * as React from "react";

import { IconCross } from "@kiesraad/icon";
import { IconButton } from "@kiesraad/ui";

import cls from "./Modal.module.css";

export interface ModalProps {
  id: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export function Modal({ id, onClose, children }: ModalProps): React.ReactNode {
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);
  const lastActiveElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      lastActiveElement.current = document.activeElement as HTMLElement;
      dialogRef.current.showModal();
      document.getElementById(id)?.focus();
    }
  }, [id]);

  return (
    <dialog id="modal-dialog" className={cls.modal} ref={dialogRef}>
      <div className={cls["modal-container"]}>
        {onClose && (
          <IconButton
            onClick={() => {
              if (dialogRef.current) {
                dialogRef.current.close();
                dialogRef.current = null;
                lastActiveElement.current?.focus();
              }
              onClose();
            }}
            icon={<IconCross />}
            title="Melding sluiten"
            size="lg"
            variant="ghost"
          />
        )}
        <div className={cls["modal-body"]}>{children}</div>
      </div>
    </dialog>
  );
}
