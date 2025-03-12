import { useContext } from "react";

import { ApiClient } from "./ApiClient";
import { ApiProviderContext, ApiState } from "./ApiProviderContext";

export function useApiClient(): ApiClient {
  const apiState = useContext<ApiState | null>(ApiProviderContext);

  if (!apiState?.client) {
    throw new Error("useApiClient must be used within an ApiProvider");
  }

  return apiState.client;
}
