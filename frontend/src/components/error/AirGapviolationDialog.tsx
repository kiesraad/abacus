import { useApiState } from "@/api/useApiState";
import { t } from "@/i18n/translate";

import { Button } from "../ui/Button/Button";
import { Modal } from "../ui/Modal/Modal";

export function AirGapViolationDialog() {
  const { airGapError } = useApiState();

  if (!airGapError) {
    return null;
  }

  return (
    <Modal title={t("error.airgap_violation.title")} noFlex={true}>
      <p>{t("error.airgap_violation.content")}</p>
      <nav>
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            window.location.reload();
          }}
        >
          {t("error.airgap_violation.reload")}
        </Button>
      </nav>
    </Modal>
  );
}
