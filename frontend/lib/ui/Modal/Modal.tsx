import * as React from "react";
import { createPortal } from "react-dom";

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
    <div className="modal">
      <div className="modal-container">
        <div className="modal-body">{children}</div>
        <button onClick={onClose}>Close</button>
      </div>
    </div>,
    modalRoot,
  );
}
