import { useState } from "react";

import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconTrash } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { t, tx } from "@/i18n/translate";
import type { PollingStation } from "@/types/generated/openapi";

export interface InvestigationDeleteModalProps {
  pollingStation: PollingStation;
  onDeleted: (pollingStation: PollingStation) => void;
}

export function InvestigationDelete({ pollingStation, onDeleted }: InvestigationDeleteModalProps) {
  const [showModal, setShowModal] = useState(false);
  const { refetch } = useElection(pollingStation.id);
  const electionStatuses = useElectionStatus();
  const status = electionStatuses.statuses.find((status) => status.polling_station_id === pollingStation.id);
  const removePath = `/api/polling_stations/${pollingStation.id}/investigation`;
  const { remove, isLoading } = useCrud({ removePath, throwAllErrors: true });

  function toggleModal() {
    setShowModal(!showModal);
  }

  function handleDelete() {
    void remove().then((result) => {
      if (isSuccess(result)) {
        void refetch().then(() => {
          onDeleted(pollingStation);
        });
      }
    });
  }

  return (
    <div className="mt-md">
      <Button variant="tertiary-destructive" leftIcon={<IconTrash />} onClick={toggleModal}>
        {t("investigations.delete_investigation")}
      </Button>

      {showModal && (
        <Modal title={`${t("investigations.delete_investigation")}?`} onClose={toggleModal}>
          <p>{t("investigations.delete_are_you_sure")}</p>
          {status && status.status !== "empty" && <p>{tx("investigations.delete_data_entry")}</p>}
          <nav>
            <Button
              leftIcon={<IconTrash />}
              variant="primary-destructive"
              size="xl"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {t("delete")}
            </Button>
            <Button variant="secondary" size="xl" onClick={toggleModal} disabled={isLoading}>
              {t("cancel")}
            </Button>
          </nav>
        </Modal>
      )}
    </div>
  );
}
