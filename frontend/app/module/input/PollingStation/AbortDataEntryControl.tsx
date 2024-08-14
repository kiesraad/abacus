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

  const c = usePollingStationFormController();

  function toggleAbortModal() {
    setOpenAbortModal(!openAbortModal);
  }

  function onAbortModalSave() {
    // TODO: implement by saving the current form state, this requires functionality from #133;
    //       right now, only the last submitted form is saved
    setSaving(true);
    navigate(`/${election.id}/input`);
  }

  const onAbortModalDelete = () =>
    void (async () => {
      // TODO: check if a data entry is already saved, this requires functionality from #133;
      //       right now, we always delete but ignore 404 errors
      try {
        setDeleting(true);
        await c.deleteDataEntry();
        navigate(`/${election.id}/input`);
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
            Ga je op een later moment verder met het invoeren van dit stembureau? Dan kan je de
            invoer die je al hebt gedaan bewaren.
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
