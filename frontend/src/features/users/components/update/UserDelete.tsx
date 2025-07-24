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
  const { remove, requestState } = useCrud<User>(`/api/user/${user.id}` satisfies USER_DELETE_REQUEST_PATH);

  function toggleModal() {
    setShowModal(!showModal);
  }

  function handleDelete() {
    void remove().then((result) => {
      if (!isSuccess(result)) {
        onError(result);
      } else {
        onDeleted();
      }
    });
  }

  const deleting = requestState.status === "loading";

  return (
    <>
      <Button type="button" variant="tertiary-destructive" leftIcon={<IconTrash />} onClick={toggleModal}>
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
              disabled={deleting}
            >
              {t("delete")}
            </Button>
            <Button variant="secondary" size="xl" onClick={toggleModal} disabled={deleting}>
              {t("cancel")}
            </Button>
          </nav>
        </Modal>
      )}
    </>
  );
}
