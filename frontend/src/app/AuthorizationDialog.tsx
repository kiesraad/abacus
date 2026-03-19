import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t, tx } from "@/i18n/translate";
import { formatTimeToGo } from "@/utils/dateTime";

interface AuthorizationDialogProps {
  sessionValidFor: number;
  extendSession: () => Promise<void>;
  setHideDialog: (hide: boolean) => void;
}

export function AuthorizationDialog({ sessionValidFor, extendSession, setHideDialog }: AuthorizationDialogProps) {
  return (
    <Modal
      title={t("users.expiration_warning")}
      noFlex={true}
      onClose={() => {
        setHideDialog(true);
      }}
    >
      <p>{tx("users.expiration_warning_details", {}, { time: formatTimeToGo(sessionValidFor) })}</p>
      <nav>
        <Button
          variant="primary"
          size="xl"
          onClick={() => {
            void extendSession();
            setHideDialog(true);
          }}
        >
          {t("users.stay_logged_in")}
        </Button>
      </nav>
    </Modal>
  );
}
