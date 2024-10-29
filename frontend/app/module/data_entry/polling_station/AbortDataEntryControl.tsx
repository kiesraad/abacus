import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useElection } from "@kiesraad/api";
import { Button } from "@kiesraad/ui";

import { AbortDataEntryModal } from "./AbortDataEntryModal";

export function AbortDataEntryControl() {
  const navigate = useNavigate();
  const { election } = useElection(1);
  const [openAbortModal, setOpenAbortModal] = useState(false);

  if (!election) {
    return null;
  }

  function toggleAbortModal() {
    setOpenAbortModal(!openAbortModal);
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={toggleAbortModal}>
        Invoer afbreken
      </Button>
      {openAbortModal && (
        <AbortDataEntryModal
          onCancel={toggleAbortModal}
          onSave={() => {
            navigate(`/elections/${election.id}/data-entry`);
          }}
          onDelete={() => {
            navigate(`/elections/${election.id}/data-entry`);
          }}
        />
      )}
    </>
  );
}
