import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t, tx } from "@/i18n/translate";
import { formatTimeToGo } from "@/utils/dateTime";

interface ExpirationDialogProps {
  sessionValidFor: number;
  onStayLoggedIn: () => void;
}

export function ExpirationDialog({ sessionValidFor, onStayLoggedIn }: ExpirationDialogProps) {
  return (
    <Modal title={t("users.expiration_warning")} noFlex={true}>
      <p>{tx("users.expiration_warning_details", {}, { time: formatTimeToGo(sessionValidFor) })}</p>
      <nav>
        <Button variant="primary" size="xl" onClick={onStayLoggedIn}>
          {t("users.stay_logged_in")}
        </Button>
      </nav>
    </Modal>
  );
}
