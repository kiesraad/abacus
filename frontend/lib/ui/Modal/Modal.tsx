import * as React from "react";
import { createPortal } from "react-dom";
import { IconButton } from "..";
import { IconCross } from "@kiesraad/icon";
import cls from "./Modal.module.css";
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, children }: ModalProps): JSX.Element | null {
  if (!isOpen) return null;

  const modalRoot = document.getElementById("modal");
  if (!modalRoot) return null;

  return createPortal(
    <div className={cls.modal}>
      <div className={cls["modal-container"]}>
        <IconButton onClick={onClose} icon={<IconCross />} isRound variant="ghost" />
        <div className={cls["modal-body"]}>{children}</div>
      </div>
    </div>,
    modalRoot,
  );
}
