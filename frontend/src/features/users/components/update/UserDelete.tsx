import { useState } from "react";

import { Button, Modal } from "@kiesraad/ui";

import { IconTrash } from "@/components/generated/icons";
import { t } from "@/utils/i18n/i18n";

interface UserDeleteProps {
  onDelete: () => void;
  saving: boolean;
}

export function UserDelete({ onDelete, saving }: UserDeleteProps) {
  const [showModal, setShowModal] = useState(false);

  function toggleModal() {
    setShowModal(!showModal);
  }

  return (
    <>
      <Button type="button" variant="tertiary-destructive" leftIcon={<IconTrash />} onClick={toggleModal}>
        {t("users.delete")}
      </Button>

      {showModal && (
        <Modal title={t("users.delete")} onClose={toggleModal}>
          <p>{t("users.delete_are_you_sure")}</p>
          <nav>
            <Button variant="primary-destructive" size="lg" onClick={onDelete} disabled={saving}>
              {t("delete")}
            </Button>
            <Button variant="secondary" size="lg" onClick={toggleModal} disabled={saving}>
              {t("cancel")}
            </Button>
          </nav>
        </Modal>
      )}
    </>
  );
}
