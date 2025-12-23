import { useEffect, useState } from "react";
import { Navigate, useMatches } from "react-router";

import { useApiState } from "@/api/useApiState";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t, tx } from "@/i18n/translate";
import { formatTimeToGo } from "@/utils/dateTime";

import { EXPIRATION_DIALOG_SECONDS } from "./authorizationConstants";

export function AuthorizationDialog() {
  const { user, loading, expiration, extendSession, setUser } = useApiState();
  const [sessionValidFor, setSessionValidFor] = useState<number | null>(
    expiration !== null ? (expiration.getTime() - new Date().getTime()) / 1000 : null,
  );
  const [hideDialog, setHideDialog] = useState(false);

  const matches = useMatches();
  const routeHandle = matches[matches.length - 1]?.handle;

  // update the current time every second when there is a session expiration
  useEffect(() => {
    if (expiration !== null) {
      const update = () => {
        const now = new Date();
        const validFor = (expiration.getTime() - now.getTime()) / 1000;
        setSessionValidFor(validFor);

        // logout after session expiration
        if (validFor <= 0 && user !== null) {
          setUser(null);
        }

        // reset hide dialog state if the session is valid for more than the expiration dialog time
        if (validFor > EXPIRATION_DIALOG_SECONDS && hideDialog) {
          setHideDialog(false);
        }
      };

      update();
      const interval = setInterval(update, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [expiration, user, setUser, hideDialog]);

  // navigate to login page if the session has expired
  if (sessionValidFor !== null && sessionValidFor <= 0 && !routeHandle?.public) {
    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

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
