import { useState } from "react";

import { AnyApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconTrash } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Loader } from "@/components/ui/Loader/Loader";
import { Modal } from "@/components/ui/Modal/Modal";
import { useElection } from "@/hooks/election/useElection";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { t, tx } from "@/i18n/translate";
import { PollingStation } from "@/types/generated/openapi";

export interface InvestigationDeleteModalProps {
  pollingStation: PollingStation;
  onDeleted: (pollingStation: PollingStation) => void;
  onError: (error: AnyApiError) => void;
}

export function InvestigationDelete({ pollingStation, onDeleted, onError }: InvestigationDeleteModalProps) {
  const [showModal, setShowModal] = useState(false);
  const { refetch } = useElection(pollingStation.id);
  const electionStatuses = useElectionStatus();
  const pollingStationStatus = electionStatuses.statuses.find(
    (status) => status.polling_station_id === pollingStation.id,
  );
  const { remove, requestState } = useCrud(`/api/polling_stations/${pollingStation.id}/investigation`);

  function toggleModal() {
    setShowModal(!showModal);
  }

  if (!pollingStationStatus) {
    return <Loader />;
  }

  function handleDelete() {
    void remove().then(async (result) => {
      if (isSuccess(result)) {
        await refetch();
        onDeleted(pollingStation);
      } else {
        onError(result);
      }
    });
  }

  const deleting = requestState.status === "loading";

  return (
    <div className="mt-md">
      <Button variant="tertiary-destructive" leftIcon={<IconTrash />} onClick={toggleModal}>
        {t("investigations.delete_investigation")}
      </Button>

      {showModal && (
        <Modal title={`${t("investigations.delete_investigation")}?`} onClose={toggleModal}>
          <p>{t("investigations.delete_are_you_sure")}</p>
          {pollingStationStatus.status !== "first_entry_not_started" && <p>{tx("investigations.delete_data_entry")}</p>}
          <nav>
            <Button
              leftIcon={<IconTrash />}
              variant="primary-destructive"
              size="xl"
              onClick={handleDelete}
              disabled={deleting}
            >
              {t("delete")}
            </Button>
            <Button variant="secondary" size="xl" onClick={toggleModal} disabled={deleting}>
              {t("cancel")}
            </Button>
          </nav>
        </Modal>
      )}
    </div>
  );
}
