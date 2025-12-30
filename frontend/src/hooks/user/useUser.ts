import { useContext } from "react";

import { ApiProviderContext, type ApiState } from "@/api/ApiProviderContext";
import type { LoginResponse } from "@/types/generated/openapi";

export function useUser(): LoginResponse | null {
  const apiState = useContext<ApiState | null>(ApiProviderContext);

  if (!apiState) {
    throw new Error("useUser must be used within an ApiProvider");
  }

  return apiState.user;
}
