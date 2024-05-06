import * as React from "react";
import { ApiClient } from "./ApiClient";

export interface iApiProviderContext {
  client: ApiClient;
}

export const ApiProviderContext =
  React.createContext<iApiProviderContext | null>(null);

export interface ApiProviderProps {
  host: string;
  children: React.ReactNode;
}
export function ApiProvider({ children, host }: ApiProviderProps) {
  const client = React.useMemo(() => new ApiClient(host), [host]);

  return (
    <ApiProviderContext.Provider value={{ client }}>
      {children}
    </ApiProviderContext.Provider>
  );
}
