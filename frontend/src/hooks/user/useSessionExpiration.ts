import { useEffect, useState } from "react";

import { useApiState } from "@/api/useApiState";

interface SessionExpirationState {
  showDialog: boolean;
  sessionValidFor: number | null;
}

export default function useSessionExpiration(expirationDialogSeconds: number): SessionExpirationState {
  const { user, loading, expiration, setUser } = useApiState();
  const [sessionValidFor, setSessionValidFor] = useState<number | null>(null);

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
      };

      update();
      const interval = setInterval(update, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [expiration, user, setUser]);

  const showDialog =
    !loading &&
    sessionValidFor !== null &&
    user !== null &&
    sessionValidFor > 0 &&
    sessionValidFor < expirationDialogSeconds;

  return {
    showDialog,
    sessionValidFor,
  };
}
