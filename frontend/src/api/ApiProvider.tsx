import { ReactNode, useEffect, useState } from "react";

import { ApiClient } from "./ApiClient";
import { ApiProviderContext, ApiState } from "./ApiProviderContext";
import { ApiError, FatalApiError } from "./ApiResult";
import useSessionState from "./useSessionState";

export interface ApiProviderProps {
  children: ReactNode;
  fetchInitialUser?: boolean;
}

const client = new ApiClient();

export function ApiProvider({ children, fetchInitialUser = true }: ApiProviderProps) {
  const { user, loading, setUser, clearSession, login, logout, expiration, setExpiration, extendSession } =
    useSessionState(client, fetchInitialUser);

  const [airGapError, setAirGapError] = useState<boolean>(false);

  // Unset the current user when the API returns an invalid session error
  // indicating that the sessions has expired or the user is not authenticated anymore
  useEffect(() => {
    const callback = (error: ApiError | FatalApiError) => {
      if (error.reference === "AirgapViolation") {
        setAirGapError(true);
      } else if ((error.reference === "InvalidSession" || error.reference === "Unauthorized") && user) {
        clearSession();
      }
    };

    return client.subscribeToApiErrors(callback);
  }, [user, clearSession, setAirGapError]);

  // Store the next session expiration time in the user state
  useEffect(() => {
    const callback = (e: Date) => {
      if (e.getTime() !== expiration?.getTime()) {
        setExpiration(e);
      }
    };

    return client.subscribeToSessionExpiration(callback);
  }, [user, setUser, expiration, setExpiration]);

  const apiState: ApiState = {
    client,
    user,
    setUser,
    clearSession,
    logout,
    login,
    loading,
    expiration,
    extendSession,
    airGapError,
  };

  if (loading && fetchInitialUser) {
    return null;
  }

  return <ApiProviderContext.Provider value={apiState}>{children}</ApiProviderContext.Provider>;
}
