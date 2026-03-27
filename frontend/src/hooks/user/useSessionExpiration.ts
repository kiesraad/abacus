import { useEffect, useState } from "react";

import { useApiState } from "@/api/useApiState";

interface SessionExpirationState {
  showDialog: boolean;
  sessionValidFor: number | null;
  setHideDialog: (hide: boolean) => void;
}

export default function useSessionExpiration(expirationDialogSeconds: number): SessionExpirationState {
  const { user, loading, expiration, setUser } = useApiState();
  const [sessionValidFor, setSessionValidFor] = useState<number | null>(null);
  const [hideDialog, setHideDialog] = useState(false);

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
        if (validFor > expirationDialogSeconds && hideDialog) {
          setHideDialog(false);
        }
      };

      update();
      const interval = setInterval(update, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [expiration, user, setUser, hideDialog, expirationDialogSeconds]);

  const showDialog =
    !loading &&
    sessionValidFor !== null &&
    user !== null &&
    !hideDialog &&
    sessionValidFor > 0 &&
    sessionValidFor < expirationDialogSeconds;

  return {
    showDialog,
    setHideDialog,
    sessionValidFor,
  };
}
