import { useApiState } from "@/api/useApiState";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t, tx } from "@/i18n/translate";
import { formatTimeToGo } from "@/utils/dateTime";

import { EXPIRATION_DIALOG_SECONDS } from "./authorizationConstants";

interface AuthorizationDialogProps {
  sessionValidFor: number | null;
  hideDialog: boolean;
  setHideDialog: (hide: boolean) => void;
}

export function AuthorizationDialog({ sessionValidFor, hideDialog, setHideDialog }: AuthorizationDialogProps) {
  const { loading, extendSession } = useApiState();
  const { user } = useApiState();

  // show dialog if the session is about to expire
  if (
    !loading &&
    sessionValidFor !== null &&
    user !== null &&
    !hideDialog &&
    sessionValidFor > 0 &&
    sessionValidFor < EXPIRATION_DIALOG_SECONDS
  ) {
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

  return null;
}
