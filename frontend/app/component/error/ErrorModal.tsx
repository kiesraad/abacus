import { ApiError } from "@kiesraad/api";
import { Button, Modal } from "@kiesraad/ui";

interface ErrorModalProps {
  error: ApiError;
}

export function ErrorModal({ error }: ErrorModalProps) {
  return (
    <Modal title="Sorry, er ging iets mis" onClose={() => {}}>
      <div className="content">
        {error.code}: {error.error}
      </div>
      <Button variant="default" onClick={() => {}}>
        Melding sluiten
      </Button>
    </Modal>
  );
}
