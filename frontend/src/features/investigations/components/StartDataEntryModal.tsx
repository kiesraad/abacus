import { type To, useNavigate } from "react-router";

import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type {
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY,
  COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH,
} from "@/types/generated/openapi";

interface StartDataEntryModalProps {
  onClose: () => void;
  to: To;
}

export function StartDataEntryModal({ onClose, to }: StartDataEntryModalProps) {
  const { currentCommitteeSession, refetch } = useElection();
  const navigate = useNavigate();
  const updatePath: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_PATH = `/api/elections/${currentCommitteeSession.election_id}/committee_sessions/${currentCommitteeSession.id}/status`;
  const { update, isLoading } = useCrud({ updatePath, throwAllErrors: true });

  function startDataEntry() {
    const body: COMMITTEE_SESSION_STATUS_CHANGE_REQUEST_BODY = { status: "data_entry_in_progress" };
    void update(body).then((result) => {
      if (isSuccess(result)) {
        void refetch().then(() => {
          void navigate(to);
        });
      }
    });
  }

  return (
    <Modal title={t("investigations.start_data_entry_question")} onClose={onClose}>
      <p>{t("investigations.start_data_entry_description")}</p>
      <nav>
        <Button
          type="button"
          variant="primary"
          size="xl"
          disabled={isLoading}
          onClick={() => {
            startDataEntry();
          }}
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
