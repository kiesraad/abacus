import * as React from "react";

import { ApiClient } from "./ApiClient";
import { ApiProviderContext } from "./ApiProviderContext";

export function useApi() {
  const client = React.useContext<ApiClient | null>(ApiProviderContext);

  if (!client) {
    throw new Error("useApi must be used within an ApiProvider");
  }

  return client;
}
