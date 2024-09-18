import * as React from "react";

import { ApiClient } from "./ApiClient";

export interface iApiProviderContext {
  client: ApiClient;
}

export const ApiProviderContext = React.createContext<iApiProviderContext | null>(null);

export interface ApiProviderProps {
  children: React.ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
  const context = React.useMemo(
    () => ({
      client: new ApiClient(),
    }),
    [],
  );

  return <ApiProviderContext.Provider value={context}>{children}</ApiProviderContext.Provider>;
}
