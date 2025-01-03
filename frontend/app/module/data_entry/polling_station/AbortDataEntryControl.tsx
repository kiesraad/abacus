import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
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
        {t("data_entry.abort.action")}
      </Button>
      {openAbortModal && (
        <AbortDataEntryModal
          onCancel={toggleAbortModal}
          onSave={() => {
            void navigate(`/elections/${election.id}/data-entry`);
          }}
          onDelete={() => {
            void navigate(`/elections/${election.id}/data-entry`);
          }}
        />
      )}
    </>
  );
}
