import * as React from "react";

import { ApiProviderContext, iApiProviderContext } from "./ApiProvider";

export function useApi() {
  const context = React.useContext<iApiProviderContext | null>(ApiProviderContext);
  if (context === null) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
}
