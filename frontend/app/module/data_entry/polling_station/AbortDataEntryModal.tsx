import { useState } from "react";

import { ApiError, ApiResult, usePollingStationFormController } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Button, Modal } from "@kiesraad/ui";

export interface AbortDataEntryModalProps {
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export function AbortDataEntryModal({ onCancel, onSave, onDelete }: AbortDataEntryModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const controller = usePollingStationFormController();

  const onAbortModalSave = () =>
    void (async () => {
      try {
        setSaving(true);
        const acceptWarnings = controller.currentForm?.getAcceptWarnings?.() ?? false;
        const response: ApiResult<unknown, ApiError> = await controller.submitCurrentForm({
          acceptWarnings,
          aborting: true,
          continueToNextSection: false,
        });
        if (!(response instanceof ApiError)) {
          onSave();
        }
      } finally {
        setSaving(false);
      }
    })();

  const onAbortModalDelete = () =>
    void (async () => {
      try {
        setDeleting(true);
        await controller.deleteDataEntry();
        onDelete();
      } finally {
        setDeleting(false);
      }
    })();

  return (
    <Modal title={t("data_entry.abort.title")} onClose={onCancel}>
      {t("data_entry.abort.description")}
      <nav>
        <Button size="lg" onClick={onAbortModalSave} disabled={saving}>
          {t("data_entry.abort.save_input")}
        </Button>
        <Button size="lg" variant="secondary" onClick={onAbortModalDelete} disabled={deleting}>
          {t("data_entry.abort.discard_input")}
        </Button>
      </nav>
    </Modal>
  );
}
