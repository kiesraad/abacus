import * as React from "react";

import { ApiClient } from "./ApiClient";

export interface iApiProviderContext {
  client: ApiClient;
}

export const ApiProviderContext = React.createContext<iApiProviderContext | null>(null);

export interface ApiProviderProps {
  host: string;
  children: React.ReactNode;
}

export function ApiProvider({ children, host }: ApiProviderProps) {
  const context = React.useMemo(() => {
    return {
      client: new ApiClient(host),
    };
  }, [host]);

  return <ApiProviderContext.Provider value={context}>{children}</ApiProviderContext.Provider>;
}
