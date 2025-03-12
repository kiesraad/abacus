import { useContext } from "react";

import { ApiState } from "./api.types";
import { ApiClient } from "./ApiClient";
import { ApiProviderContext } from "./ApiProviderContext";

export function useApiClient(): ApiClient {
  const apiState = useContext<ApiState | null>(ApiProviderContext);

  if (!apiState?.client) {
    throw new Error("useApiClient must be used within an ApiProvider");
  }

  return apiState.client;
}
