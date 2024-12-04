import * as React from "react";

import { usePollingStationMutation } from "@kiesraad/api";
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
    <Modal title="Stembureau verwijderen" onClose={onCancel}>
      <p>Weet je zeker dat je dit stembureau wilt verwijderen? Deze actie kan niet worden teruggedraaid.</p>
      <nav>
        <Button variant="primary-destructive" size="lg" onClick={handleDelete} disabled={deleting}>
          Verwijder stembureau
        </Button>
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={deleting}>
          Annuleren
        </Button>
      </nav>
    </Modal>
  );
}
