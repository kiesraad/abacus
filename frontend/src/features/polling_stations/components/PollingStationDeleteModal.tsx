import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconTrash } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t } from "@/i18n/translate";
import { PollingStation } from "@/types/generated/openapi";

export interface PollingStationDeleteModalProps {
  electionId: number;
  pollingStation: PollingStation;
  onDeleted: (pollingStation: PollingStation) => void;
  onError: () => void;
  onCancel: () => void;
}

export function PollingStationDeleteModal({
  electionId,
  pollingStation,
  onDeleted,
  onCancel,
  onError,
}: PollingStationDeleteModalProps) {
  const { remove, requestState } = useCrud(`/api/elections/${electionId}/polling_stations/${pollingStation.id}`);

  function handleDelete() {
    void remove().then((result) => {
      if (isSuccess(result)) {
        onDeleted(pollingStation);
      } else {
        onError();
      }
    });
  }

  const deleting = requestState.status === "loading";

  return (
    <Modal title={t("polling_station.delete")} onClose={onCancel}>
      <p>{t("polling_station.delete_are_you_sure")}</p>
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
        <Button variant="secondary" size="xl" onClick={onCancel} disabled={deleting}>
          {t("cancel")}
        </Button>
      </nav>
    </Modal>
  );
}
