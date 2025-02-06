import { useContext } from "react";

import { ApiState } from "./api.types";
import { ApiProviderContext } from "./ApiProviderContext";
import { LoginResponse } from "./gen/openapi";

export function useUser(): LoginResponse | null {
  const apiState = useContext<ApiState | null>(ApiProviderContext);

  if (!apiState) {
    throw new Error("useUser must be used within an ApiProvider");
  }

  return apiState.user;
}
