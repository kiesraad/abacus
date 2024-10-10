import { ReactNode, useEffect, useRef } from "react";

import { IconCross } from "@kiesraad/icon";
import { IconButton } from "@kiesraad/ui";

import cls from "./Modal.module.css";

export interface ModalProps {
  title: string;
  onClose?: () => void;
  children?: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const lastActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      lastActiveElement.current = document.activeElement as HTMLElement;
      dialogRef.current.showModal();
      document.getElementById("modal-title")?.focus();
    }
  }, []);

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
            title="Annuleren"
            size="lg"
            variant="ghost"
          />
        )}
        <div className={cls["modal-body"]}>
          <h2 id="modal-title" tabIndex={-1}>
            {title}
          </h2>
          {children}
        </div>
      </div>
    </dialog>
  );
}
