import { useState } from "react";

import { AnyApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconTrash } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t } from "@/i18n/translate";
import { User, USER_DELETE_REQUEST_PATH } from "@/types/generated/openapi";

interface UserDeleteProps {
  user: User;
  onDeleted: () => void;
  onError: (error: AnyApiError) => void;
}

export function UserDelete({ user, onDeleted, onError }: UserDeleteProps) {
  const [showModal, setShowModal] = useState(false);
  const removePath: USER_DELETE_REQUEST_PATH = `/api/user/${user.id}`;
  const { remove, isLoading } = useCrud<User>({ removePath });

  function toggleModal() {
    setShowModal(!showModal);
  }

  function handleDelete() {
    void remove().then((result) => {
      if (isSuccess(result)) {
        onDeleted();
      } else {
        onError(result);
        setShowModal(false);
      }
    });
  }

  return (
    <div className="mt-md">
      <Button variant="tertiary-destructive" leftIcon={<IconTrash />} onClick={toggleModal}>
        {t("users.delete")}
      </Button>

      {showModal && (
        <Modal title={t("users.delete")} onClose={toggleModal}>
          <p>{t("users.delete_are_you_sure")}</p>
          <nav>
            <Button
              leftIcon={<IconTrash />}
              variant="primary-destructive"
              size="xl"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {t("delete")}
            </Button>
            <Button variant="secondary" size="xl" onClick={toggleModal} disabled={isLoading}>
              {t("cancel")}
            </Button>
          </nav>
        </Modal>
      )}
    </div>
  );
}
