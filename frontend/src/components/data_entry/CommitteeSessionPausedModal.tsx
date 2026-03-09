import { CommitteeSessionStatusWithRightIcon } from "@/components/committee_session/CommitteeSessionStatus";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t } from "@/i18n/translate";
import type { CommitteeCategory } from "@/types/generated/openapi.ts";

interface CommitteeSessionPausedModalProps {
  showUnsavedChanges?: boolean;
  committeeCategory: CommitteeCategory;
}

export function CommitteeSessionPausedModal({
  showUnsavedChanges,
  committeeCategory,
}: CommitteeSessionPausedModalProps) {
  return (
    <Modal
      title={
        <CommitteeSessionStatusWithRightIcon committeeCategory={committeeCategory} status="paused" userRole="typist" />
      }
    >
      <p>
        {t("error.api_error.CommitteeSessionPaused")}
        {showUnsavedChanges && ` [${t("data_entry.changes_are_not_saved")}]`}
      </p>
      <nav>
        <Button.Link variant="primary" size="xl" to="/elections">
          {t("data_entry.to_overview")}
        </Button.Link>
        <Button.Link variant="secondary" size="xl" to="/account/logout">
          {t("account.logout")}
        </Button.Link>
      </nav>
    </Modal>
  );
}
