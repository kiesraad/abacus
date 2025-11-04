import { useState } from "react";

import { AnyApiError, ApiError } from "@/api/ApiResult";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { TranslationPath } from "@/i18n/i18n.types";
import { t } from "@/i18n/translate";

interface ErrorModalProps {
  error: AnyApiError;
}

export function ErrorModal({ error }: ErrorModalProps) {
  const [dismissedError, setDismissedError] = useState<AnyApiError | null>(null);

  // we keep track of the dismissed error to not show the same error modal again
  const hideModal = () => {
    setDismissedError(error);
  };

  // hide dismissed modals
  if (dismissedError === error) {
    return null;
  }

  if (error instanceof ApiError) {
    const key: TranslationPath = `error.api_error.${error.reference}`;

    if (key !== t(key)) {
      return (
        <Modal title={t("something_went_wrong")} onClose={hideModal}>
          <p>
            <strong>{t(key)}</strong>
          </p>
          <nav>
            <Button size="md" onClick={hideModal}>
              {t("close_message")}
            </Button>
          </nav>
        </Modal>
      );
    }
  }

  return (
    <Modal title={t("something_went_wrong")} onClose={hideModal}>
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
    </Modal>
  );
}
