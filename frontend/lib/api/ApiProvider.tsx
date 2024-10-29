import * as React from "react";

import { ApiClient } from "./ApiClient";
import { ApiProviderContext } from "./ApiProviderContext";

export interface ApiProviderProps {
  children: React.ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
  const client = new ApiClient();

  return <ApiProviderContext.Provider value={{ client }}>{children}</ApiProviderContext.Provider>;
}
