import { ReactNode, useEffect } from "react";

import { ApiState } from "./api.types";
import { ApiClient } from "./ApiClient";
import { ApiError } from "./ApiError";
import { ApiProviderContext } from "./ApiProviderContext";
import useSessionState from "./useSessionState";

export interface ApiProviderProps {
  children: ReactNode;
  fetchInitialUser?: boolean;
}

const client = new ApiClient();

export function ApiProvider({ children, fetchInitialUser = true }: ApiProviderProps) {
  const { user, loading, setUser, login, logout, expiration, setExpiration, extendSession } = useSessionState(
    client,
    fetchInitialUser,
  );

  // Unset the current user when the API returns an invalid session error
  // indicating that the sessions has expired or the user is not authenticated anymore
  useEffect(() => {
    const callback = (error: ApiError) => {
      if (error.reference === "InvalidSession" && user) {
        setUser(null);
      }
    };

    return client.subscribeToApiErrors(callback);
  }, [user, setUser]);

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
  };

  return <ApiProviderContext.Provider value={apiState}>{children}</ApiProviderContext.Provider>;
}
