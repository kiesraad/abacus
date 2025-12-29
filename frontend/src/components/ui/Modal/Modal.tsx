import { ReactElement, ReactNode, useEffect, useRef } from "react";

import { IconCross } from "@/components/generated/icons";
import { t } from "@/i18n/translate";
import { cn } from "@/utils/classnames";

import { IconButton } from "../IconButton/IconButton";
import cls from "./Modal.module.css";

export interface ModalProps {
  title: string | ReactElement;
  noFlex?: boolean;
  autoWidth?: boolean;
  onClose?: () => void;
  children?: ReactNode;
}

/**
 * Modal component
 *
 * @param {string} title - The title of the modal.
 * @param {boolean} noFlex - If true, the modal will not use flexbox for is contents layout.
 * @param {boolean} autoWidth - If true, the modal width will be set to auto.
 * @param {function} onClose - Callback function to be called when the modal should be closed.
 * @param {ReactNode} children - The content of the modal.
 * @returns {ReactNode} The rendered modal component.
 */
export function Modal({ title, noFlex = false, autoWidth = false, onClose, children }: ModalProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const lastActiveElement = useRef<HTMLElement | null>(null);

  // open the modal when the component is mounted and focus on the title element
  useEffect(() => {
    if (dialogRef.current) {
      if (document.activeElement instanceof HTMLElement) {
        lastActiveElement.current = document.activeElement;
      }
      dialogRef.current.showModal();
      document.getElementById("modal-title")?.focus();
    }
  }, []);

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
  }, [onClose]);

  return (
    <dialog id="modal-dialog" className={cls.modal} ref={dialogRef} aria-labelledby="modal-title">
      <div className={cn(cls.modalContainer, autoWidth && cls.autoWidth)}>
        {onClose && (
          <IconButton
            onClick={() => {
              // focus on the last active element
              lastActiveElement.current?.focus();
              onClose();
            }}
            icon={<IconCross />}
            title={t("close_modal")}
            size="lg"
            variant="tertiary"
            type="button"
          />
        )}
        <div className={cls.modalBody}>
          <h3 id="modal-title" tabIndex={-1}>
            {title}
          </h3>
          {noFlex ? <div className={cls.noFlex}>{children}</div> : children}
        </div>
      </div>
    </dialog>
  );
}
