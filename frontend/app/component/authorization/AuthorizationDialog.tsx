import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";

import { useApiState } from "@kiesraad/api";
import { t, tx } from "@kiesraad/i18n";
import { Button, Modal } from "@kiesraad/ui";
import { formatTimeToGo } from "@kiesraad/util";

import { ALLOW_UNAUTHORIZED, EXPIRATION_DIALOG_SECONDS } from "./authorizationConstants";

export function AuthorizationDialog() {
  const { user, loading, expiration, extendSession } = useApiState();
  const location = useLocation();
  const path = location.pathname;
  const [now, setNow] = useState(new Date());
  const [hideDialog, setHideDialog] = useState(false);

  // update the current time every second when there is a session expiration
  useEffect(() => {
    if (expiration !== null) {
      const interval = setInterval(() => {
        setNow(new Date());
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [expiration]);

  // navigate to login page if the user is not authenticated
  if (!loading && !user && !ALLOW_UNAUTHORIZED.includes(path)) {
    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

  // show dialog if the session is about to expire
  if (!loading && expiration !== null) {
    const sessionValidFor = (expiration.getTime() - now.getTime()) / 1000;

    if (!hideDialog && sessionValidFor > 0 && sessionValidFor < EXPIRATION_DIALOG_SECONDS) {
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
              size="lg"
              onClick={() => {
                void extendSession();
              }}
            >
              {t("users.stay_logged_in")}
            </Button>
          </nav>
        </Modal>
      );
    } else if (sessionValidFor <= 0) {
      return <Navigate to="/account/login" state={{ unauthorized: true }} />;
    }
  }

  return null;
}
