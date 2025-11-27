import { AnyApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconTrash } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t } from "@/i18n/translate";
import { POLLING_STATION_DELETE_REQUEST_PATH, PollingStation } from "@/types/generated/openapi";

export interface PollingStationDeleteModalProps {
  electionId: number;
  pollingStation: PollingStation;
  onDeleted: (pollingStation: PollingStation) => void;
  onError: (error: AnyApiError) => void;
  onCancel: () => void;
}

export function PollingStationDeleteModal({
  electionId,
  pollingStation,
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
        onError(result);
      }
    });
  }

  return (
    <Modal title={t("polling_station.delete_modal.title")} onClose={onCancel}>
      <p>{t("polling_station.delete_modal.confirm")}</p>
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
