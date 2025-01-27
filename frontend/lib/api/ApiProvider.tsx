import { ReactNode } from "react";

import { ApiState } from "./api.types";
import { ApiClient } from "./ApiClient";
import { ApiProviderContext } from "./ApiProviderContext";
import useSessionState from "./useSessionState";

export interface ApiProviderProps {
  children: ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
  const client = new ApiClient();
  const { user, setUser } = useSessionState();

  const apiState: ApiState = {
    client,
    user,
    setUser,
  };

  return <ApiProviderContext.Provider value={apiState}>{children}</ApiProviderContext.Provider>;
}
