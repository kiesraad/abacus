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

  // open the modal when the component is mounted and focus on the title element
  useEffect(() => {
    if (dialogRef.current) {
      lastActiveElement.current = document.activeElement as HTMLElement;
      dialogRef.current.showModal();
      document.getElementById("modal-title")?.focus();
    }
  }, [dialogRef]);

  // handle cancel / close actions for the modal
  useEffect(() => {
    if (dialogRef.current) {
      const dialog = dialogRef.current;
      // when the user presses the escape key, close the modal by calling the onClose function
      const cancel = (e: Event) => {
        e.preventDefault();
        // focus on the last active element
        lastActiveElement.current?.focus();
        if (onClose) {
          onClose();
        }
      };

      dialog.addEventListener("cancel", cancel);
      return () => {
        dialog.removeEventListener("cancel", cancel);
      };
    }
  }, [dialogRef, onClose]);

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
