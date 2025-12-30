import { useState } from "react";

import { type AnyApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconTrash } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t } from "@/i18n/translate";
import type {
  DataEntryStatusName,
  POLLING_STATION_DATA_ENTRIES_AND_RESULT_DELETE_REQUEST_PATH,
  PollingStation,
  PollingStationInvestigation,
} from "@/types/generated/openapi";

interface ReadOnlyDataEntryDeleteProps {
  pollingStation: PollingStation;
  status: DataEntryStatusName;
  onDeleted: () => void;
  onError: (error: AnyApiError) => void;
}

export function ReadOnlyDataEntryDelete({ pollingStation, status, onDeleted, onError }: ReadOnlyDataEntryDeleteProps) {
  const [showModal, setShowModal] = useState(false);
  const removePath: POLLING_STATION_DATA_ENTRIES_AND_RESULT_DELETE_REQUEST_PATH = `/api/polling_stations/${pollingStation.id}/data_entries`;
  const { remove, isLoading } = useCrud<PollingStationInvestigation>({ removePath });

  function toggleModal() {
    setShowModal(!showModal);
  }

  function handleDelete() {
    void remove().then((result) => {
      if (isSuccess(result)) {
        onDeleted();
      } else {
        onError(result);
        setShowModal(false);
      }
    });
  }

  return (
    <div>
      <Button variant="tertiary-destructive" leftIcon={<IconTrash />} onClick={toggleModal}>
        {t("data_entry_detail.delete")}
      </Button>

      {showModal && (
        <Modal title={t("data_entry_detail.delete")} onClose={toggleModal}>
          {status === "second_entry_in_progress" || status === "definitive" ? (
            <p>{t("data_entry_detail.delete_all_are_you_sure", { nr: pollingStation.number })}</p>
          ) : (
            <p>{t("data_entry_detail.delete_are_you_sure", { nr: pollingStation.number })}</p>
          )}
          <nav>
            <Button
              leftIcon={<IconTrash />}
              variant="primary-destructive"
              size="lg"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {t("data_entry_detail.delete_data_entry")}
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
