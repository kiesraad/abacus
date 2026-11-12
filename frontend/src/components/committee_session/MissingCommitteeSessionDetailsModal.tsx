import { type To, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t } from "@/i18n/translate";

interface MissingCommitteeSessionDetailsModal {
  onClose: () => void;
  to: To;
}

export function MissingCommitteeSessionDetailsModal({ onClose, to }: MissingCommitteeSessionDetailsModal) {
  const { isAdministrator, isCoordinator } = useUserRole();
  const navigate = useNavigate();

  return (
    <Modal title={t("election_management.missing_committee_session_details_modal.title")} onClose={onClose}>
      <p>{t("election_management.missing_committee_session_details_modal.content")}</p>
      {isAdministrator && <p>{t("election_management.missing_committee_session_details_modal.ask_coordinator")}</p>}
      {isCoordinator && (
        <nav>
          <Button
            size="xl"
            onClick={() => {
              void navigate(to);
            }}
          >
            {t("election_management.missing_committee_session_details_modal.enter_details_button")}
          </Button>
          <Button variant="secondary" size="xl" onClick={onClose}>
            {t("cancel")}
          </Button>
        </nav>
      )}
    </Modal>
  );
}
