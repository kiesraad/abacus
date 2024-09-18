import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useElection } from "@kiesraad/api";
import { Button } from "@kiesraad/ui";

import { AbortDataEntryModal } from "./AbortDataEntryModal";

export function AbortDataEntryControl() {
  const navigate = useNavigate();
  const { election } = useElection();

  const [openAbortModal, setOpenAbortModal] = useState(false);

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
            navigate(`/${election.id}/input`);
          }}
          onDelete={() => {
            navigate(`/${election.id}/input`);
          }}
        />
      )}
    </>
  );
}
