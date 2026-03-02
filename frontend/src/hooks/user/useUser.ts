import { useContext } from "react";

import { ApiProviderContext, type ApiState } from "@/api/ApiProviderContext";
import type { LoginResponse } from "@/types/generated/openapi";
import { type RoleWithoutCommitteeCategory, roleWithoutCommitteeCategory } from "@/utils/role";

export type UseUserReturn = (LoginResponse & { roleWithoutCommitteeCategory: RoleWithoutCommitteeCategory }) | null;

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
    roleWithoutCommitteeCategory: roleWithoutCommitteeCategory(apiState.user.role),
  };
}
