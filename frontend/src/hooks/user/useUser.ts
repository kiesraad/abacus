import { useContext } from "react";

import { ApiProviderContext, type ApiState } from "@/api/ApiProviderContext";
import type { LoginResponse } from "@/types/generated/openapi";
import { type RoleWithoutElection, roleWithoutElection } from "@/utils/role";

export type UseUserReturn = (LoginResponse & { roleWithoutElection: RoleWithoutElection }) | null;

export function useUser(): UseUserReturn {
  const apiState = useContext<ApiState | null>(ApiProviderContext);

  if (!apiState) {
    throw new Error("useUser must be used within an ApiProvider");
  }

  if (apiState.user === null) {
    return null;
  }

  return {
    ...apiState.user,
    roleWithoutElection: roleWithoutElection(apiState.user.role),
  };
}
