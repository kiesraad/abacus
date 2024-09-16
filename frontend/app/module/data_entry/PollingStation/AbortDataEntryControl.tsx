import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useElection, usePollingStationFormController } from "@kiesraad/api";
import { Button, Modal } from "@kiesraad/ui";

export function AbortDataEntryControl() {
  const navigate = useNavigate();
  const { election } = useElection();

  const [openAbortModal, setOpenAbortModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const controller = usePollingStationFormController();

  function toggleAbortModal() {
    setOpenAbortModal(!openAbortModal);
  }

  const onAbortModalSave = () =>
    void (async () => {
      try {
        setSaving(true);
        await controller.submitCurrentForm();
        navigate(`/elections/${election.id}/data-entry`);
      } finally {
        setSaving(false);
      }
    })();

  const onAbortModalDelete = () =>
    void (async () => {
      try {
        setDeleting(true);
        await controller.deleteDataEntry();
        navigate(`/elections/${election.id}/data-entry`);
      } finally {
        setDeleting(false);
      }
    })();

  return (
    <>
      <Button variant="secondary" size="sm" onClick={toggleAbortModal}>
        Invoer afbreken
      </Button>
      {openAbortModal && (
        <Modal onClose={toggleAbortModal}>
          <h2>Wat wil je doen met je invoer?</h2>
          <p>
            Ga je op een later moment verder met het invoeren van dit stembureau? Dan kan je de invoer die je al hebt
            gedaan bewaren.
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
      )}
    </>
  );
}
