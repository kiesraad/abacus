import { ReactNode, useEffect } from "react";

import { ApiState } from "./api.types";
import { ApiClient } from "./ApiClient";
import { ApiError } from "./ApiError";
import { ApiProviderContext } from "./ApiProviderContext";
import useSessionState from "./useSessionState";

export interface ApiProviderProps {
  children: ReactNode;
  initialUser?: boolean;
}

const client = new ApiClient();

export function ApiProvider({ children, initialUser = true }: ApiProviderProps) {
  const { user, setUser } = useSessionState(initialUser);

  // Unset the current user when the API returns a 401,
  // indicating that the sessions has expired or the user is not authenticated anymore
  useEffect(() => {
    const callback = (error: ApiError) => {
      if (error.code === 401 && user) {
        setUser(null);
      }
    };

    return client.subscribeToApiErrors(callback);
  }, [user, setUser]);

  const apiState: ApiState = {
    client,
    user,
    setUser,
  };

  return <ApiProviderContext.Provider value={apiState}>{children}</ApiProviderContext.Provider>;
}
