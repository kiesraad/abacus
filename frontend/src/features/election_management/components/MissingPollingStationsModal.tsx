import { type To, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t } from "@/i18n/translate";

interface MissingPollingStationsModalProps {
  onClose: () => void;
  to: To;
}

export function MissingPollingStationsModal({ onClose, to }: MissingPollingStationsModalProps) {
  const navigate = useNavigate();

  return (
    <Modal title={t("election_management.missing_polling_stations_modal.title")} onClose={onClose}>
      <p>{t("election_management.missing_polling_stations_modal.content")}</p>
      <nav>
        <Button
          size="xl"
          onClick={() => {
            void navigate(to);
          }}
        >
          {t("election_management.missing_polling_stations_modal.add_polling_stations_button")}
        </Button>
        <Button variant="secondary" size="lg" onClick={onClose}>
          {t("cancel")}
        </Button>
      </nav>
    </Modal>
  );
}
