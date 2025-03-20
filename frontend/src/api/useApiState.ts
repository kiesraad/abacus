import { useContext } from "react";

import { ApiProviderContext, ApiState } from "./ApiProviderContext";

export function useApiState(): ApiState {
  const apiState = useContext<ApiState | null>(ApiProviderContext);

  if (!apiState) {
    throw new Error("useApiState must be used within an ApiProvider");
  }

  return apiState;
}
