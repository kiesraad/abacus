import { ReactNode, useEffect } from "react";

import { ApiClient } from "./ApiClient";
import { ApiProviderContext, ApiState } from "./ApiProviderContext";
import { ApiError } from "./ApiResult";
import useSessionState from "./useSessionState";

export interface ApiProviderProps {
  children: ReactNode;
  fetchInitialUser?: boolean;
}

const client = new ApiClient();

export function ApiProvider({ children, fetchInitialUser = true }: ApiProviderProps) {
  const {
    user,
    loading,
    setUser,
    login,
    logout,
    expiration,
    setExpiration,
    extendSession,
    airGapError,
    setAirGapError,
  } = useSessionState(client, fetchInitialUser);

  // Unset the current user when the API returns an invalid session error
  // indicating that the sessions has expired or the user is not authenticated anymore
  useEffect(() => {
    const callback = (error: ApiError) => {
      if (error.reference === "AirgapViolation") {
        setAirGapError(true);
      } else if ((error.reference === "InvalidSession" || error.reference === "Unauthorized") && user) {
        setUser(null);
      }
    };

    return client.subscribeToApiErrors(callback);
  }, [user, setUser, setAirGapError]);

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
