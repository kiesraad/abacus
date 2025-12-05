import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconTrash } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t, tx } from "@/i18n/translate";
import { POLLING_STATION_DELETE_REQUEST_PATH, PollingStation } from "@/types/generated/openapi";

export interface PollingStationDeleteModalProps {
  electionId: number;
  pollingStation: PollingStation;
  existingInvestigation: boolean;
  existingDataEntry: boolean;
  onDeleted: (pollingStation: PollingStation) => void;
  onError: () => void;
  onCancel: () => void;
}

export function PollingStationDeleteModal({
  electionId,
  pollingStation,
  existingInvestigation,
  existingDataEntry,
  onDeleted,
  onCancel,
  onError,
}: PollingStationDeleteModalProps) {
  const removePath: POLLING_STATION_DELETE_REQUEST_PATH = `/api/elections/${electionId}/polling_stations/${pollingStation.id}`;
  const { remove, isLoading } = useCrud({ removePath, throwAllErrors: false });

  function handleDelete() {
    void remove().then((result) => {
      if (isSuccess(result)) {
        onDeleted(pollingStation);
      } else {
        onError();
      }
    });
  }

  function deleteWarning() {
    if (existingDataEntry && existingInvestigation) {
      return tx("polling_station.delete_modal.existing_investigation_and_data_entry");
    }
    if (existingDataEntry) {
      return tx("polling_station.delete_modal.existing_data_entry");
    }
    if (existingInvestigation) {
      return tx("polling_station.delete_modal.existing_investigation");
    }
  }

  return (
    <Modal title={t("polling_station.delete_modal.title")} onClose={onCancel}>
      <span>
        {deleteWarning()}
        {t("polling_station.delete_modal.action_cannot_be_reverted")}
      </span>
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
        <Button variant="secondary" size="xl" onClick={onCancel} disabled={isLoading}>
          {t("cancel")}
        </Button>
      </nav>
    </Modal>
  );
}
