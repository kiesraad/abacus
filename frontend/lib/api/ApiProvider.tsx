import { ReactNode } from "react";

import { ApiState } from "./api.types";
import { ApiClient } from "./ApiClient";
import { ApiProviderContext } from "./ApiProviderContext";
import useSessionState from "./useSessionState";

export interface ApiProviderProps {
  children: ReactNode;
  initialUser?: boolean;
}

export function ApiProvider({ children, initialUser = true }: ApiProviderProps) {
  const client = new ApiClient();
  const { user, setUser } = useSessionState(initialUser);

  const apiState: ApiState = {
    client,
    user,
    setUser,
  };

  return <ApiProviderContext.Provider value={apiState}>{children}</ApiProviderContext.Provider>;
}
