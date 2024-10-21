import { useEffect, useState } from "react";

import { ApiError } from "@kiesraad/api";
import { Button, Modal } from "@kiesraad/ui";

interface ErrorModalProps {
  error: ApiError;
}

export function ErrorModal({ error }: ErrorModalProps) {
  const [hide, setHide] = useState(false);
  const hideModal = () => {
    setHide(true);
  };

  // show the modal again if the error changes
  useEffect(() => {
    setHide(false);
  }, [error]);

  // hide dismissed modals
  if (hide) {
    return null;
  }

  return (
    <Modal title="Sorry, er ging iets mis" onClose={hideModal}>
      <div id="error-modal">
        <p>
          <strong>
            Foutcode: <code>{error.code}</code>
          </strong>
        </p>
        <p>{error.error}</p>
        <Button variant="default" onClick={hideModal}>
          Melding sluiten
        </Button>
      </div>
    </Modal>
  );
}
