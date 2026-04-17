import type { UseUserReturn } from "@/hooks/user/useUser";
import type { CommitteeCategory } from "@/types/generated/openapi";

export function getTypistUser(): NonNullable<UseUserReturn> {
  return {
    needs_password_change: false,
    role: "typist_gsb",
    user_id: 1,
    username: "testuser",
  };
}

export function getCoordinatorUser(
  committeeCategory: Lowercase<CommitteeCategory> = "gsb",
): NonNullable<UseUserReturn> {
  return {
    needs_password_change: false,
    role: `coordinator_${committeeCategory}`,
    user_id: 2,
    username: "testcoordinator",
  };
}

export function getAdminUser(): NonNullable<UseUserReturn> {
  return {
    needs_password_change: false,
    role: "administrator",
    user_id: 3,
    username: "testadministrator",
  };
}
