import { useEffect, useState } from "react";

import { AnyApiError, ApiError } from "@/api/ApiResult";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { TranslationPath } from "@/i18n/i18n.types";
import { t } from "@/i18n/translate";

import cls from "./ErrorModal.module.css";

interface ErrorModalProps {
  error: AnyApiError;
}

export function ErrorModal({ error }: ErrorModalProps) {
  const [hide, setHide] = useState(false);
  const hideModal = () => {
    setHide(true);
  };

  // show the modal again if the error changes
  useEffect(() => {
    setHide(false);
  }, [error]);

  // hide dismissed modals
  if (hide) {
    return null;
  }

  if (error instanceof ApiError) {
    const key: TranslationPath = `error.api_error.${error.reference}`;

    if (key !== t(key)) {
      return (
        <Modal title={t("something_went_wrong")} onClose={hideModal}>
          <div id="error-modal" className={cls.error}>
            <p>
              <strong>{t(key)}</strong>
            </p>
            <nav>
              <Button size="md" onClick={hideModal}>
                {t("close_message")}
              </Button>
            </nav>
          </div>
        </Modal>
      );
    }
  }

  return (
    <Modal title={t("something_went_wrong")} onClose={hideModal}>
      <div id="error-modal" className={cls.error}>
        {error instanceof ApiError && error.code && (
          <p>
            <strong>
              {t("error_code")}: <code>{error.code}</code>
            </strong>
          </p>
        )}
        <p>{error.message}</p>
        <nav>
          <Button size="md" onClick={hideModal}>
            {t("close_message")}
          </Button>
        </nav>
      </div>
    </Modal>
  );
}
