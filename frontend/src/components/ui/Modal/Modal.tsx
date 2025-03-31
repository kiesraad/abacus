import { ReactNode, useEffect, useRef } from "react";

import { t } from "@kiesraad/i18n";
import { IconCross } from "@kiesraad/icon";
import { IconButton } from "@kiesraad/ui";

import cls from "./Modal.module.css";

export interface ModalProps {
  title: string;
  noFlex?: boolean;
  onClose?: () => void;
  children?: ReactNode;
}

/**
 * Modal component
 *
 * @param {string} title - The title of the modal.
 * @param {boolean} noFlex - If true, the modal will not use flexbox for is contents layout.
 * @param {function} onClose - Callback function to be called when the modal is closed.
 * @param {ReactNode} children - The content of the modal.
 * @returns {ReactNode} The rendered modal component.
 */
export function Modal({ title, noFlex = false, onClose, children }: ModalProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const lastActiveElement = useRef<HTMLElement | null>(null);

  // show the dialog as a modal and focus on the title
  useEffect(() => {
    // open the modal
    dialogRef.current?.showModal();
    // set the previous active element
    lastActiveElement.current = document.activeElement as HTMLElement;
    // focus on the modal
    document.getElementById("modal-title")?.focus();
  }, [dialogRef]);

  return (
    <dialog id="modal-dialog" className={cls.modal} ref={dialogRef}>
      <div className={cls["modal-container"]}>
        {onClose && (
          <IconButton
            onClick={() => {
              // focus on the last active element
              lastActiveElement.current?.focus();
              onClose();
            }}
            icon={<IconCross />}
            title={t("cancel")}
            size="lg"
            variant="tertiary"
            type="button"
          />
        )}
        <div className={cls["modal-body"]}>
          <h2 id="modal-title" tabIndex={-1}>
            {title}
          </h2>
          {noFlex ? <div className={cls["no-flex"]}>{children}</div> : children}
        </div>
      </div>
    </dialog>
  );
}
