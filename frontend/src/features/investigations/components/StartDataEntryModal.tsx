import { To, useNavigate } from "react-router";

import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";

interface StartDataEntryModalProps {
  onClose: () => void;
  to: To;
}

export function StartDataEntryModal({ onClose, to }: StartDataEntryModalProps) {
  const { currentCommitteeSession } = useElection();
  const navigate = useNavigate();
  const url: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/committee_sessions/${currentCommitteeSession.id}/status`;
  const { update, requestState } = useCrud({ update: url });

  if (requestState.status === "api-error") {
    throw requestState.error;
  }

  const startDataEntry = async () => {
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry_in_progress" };
    const result = await update(body);

    if (isSuccess(result)) {
      void navigate(to);
    }
  };

  return (
    <Modal title={t("investigations.start_data_entry_question")} onClose={onClose}>
      <p>{t("investigations.start_data_entry_description")}</p>
      <nav>
        <Button
          type="button"
          variant="primary"
          size="xl"
          disabled={requestState.status === "loading"}
          onClick={() => void startDataEntry()}
        >
          {t("investigations.start_data_entry")}
        </Button>
        <Button type="button" variant="secondary" size="xl" onClick={onClose}>
          {t("cancel")}
        </Button>
      </nav>
    </Modal>
  );
}
