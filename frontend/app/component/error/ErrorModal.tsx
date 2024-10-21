import { ApiError } from "@kiesraad/api";
import { Button, Modal } from "@kiesraad/ui";

interface ErrorModalProps {
  error: ApiError;
}

export function ErrorModal({ error }: ErrorModalProps) {
  return (
    <Modal title="Sorry, er ging iets mis" onClose={() => {}}>
      <div className="content">
        <p>
          <strong>
            Foutcode: <code>{error.code}</code>
          </strong>
        </p>
        <p>{error.error}</p>
        <Button variant="default" onClick={() => {}}>
          Melding sluiten
        </Button>
      </div>
    </Modal>
  );
}
