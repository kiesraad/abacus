import * as React from "react";

import { usePollingStationMutation } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Button, Modal } from "@kiesraad/ui";

export interface PollingStationDeleteModalProps {
  pollingStationId: number;
  onDeleted: () => void;
  onError: () => void;
  onCancel: () => void;
}

export function PollingStationDeleteModal({
  pollingStationId,
  onDeleted,
  onCancel,
  onError,
}: PollingStationDeleteModalProps) {
  const { remove, requestState } = usePollingStationMutation();

  function handleDelete() {
    remove(pollingStationId);
  }

  React.useEffect(() => {
    if (requestState.status === "success") {
      onDeleted();
    } else if (requestState.status === "api-error") {
      onError();
    }
  }, [requestState, onDeleted, onError]);

  const deleting = requestState.status === "loading";

  return (
    <Modal title={t("polling_station.delete")} onClose={onCancel}>
      <p>{t("polling_station.delete_are_you_sure")}</p>
      <nav>
        <Button variant="primary-destructive" size="lg" onClick={handleDelete} disabled={deleting}>
          {t("delete")}
        </Button>
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={deleting}>
          {t("cancel")}
        </Button>
      </nav>
    </Modal>
  );
}
