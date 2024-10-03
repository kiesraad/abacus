import { useState } from "react";

import { usePollingStationFormController } from "@kiesraad/api";
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
        await controller.submitCurrentForm({ aborting: true, continueToNextSection: false });
        onSave();
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
    <Modal onClose={onCancel}>
      <h2 id="abort-modal-title">Wat wil je doen met je invoer?</h2>
      <p>
        Ga je op een later moment verder met het invoeren van dit stembureau? Dan kan je de invoer die je al hebt gedaan
        bewaren.
        <br />
        <br />
        Twijfel je? Overleg dan met de coördinator.
      </p>
      <nav>
        <Button size="lg" onClick={onAbortModalSave} disabled={saving}>
          Invoer bewaren
        </Button>
        <Button size="lg" variant="secondary" onClick={onAbortModalDelete} disabled={deleting}>
          Niet bewaren
        </Button>
      </nav>
    </Modal>
  );
}
