import * as React from "react";

import { ApiClient } from "./ApiClient";
import { ApiProviderContext } from "./ApiProviderContext";

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
