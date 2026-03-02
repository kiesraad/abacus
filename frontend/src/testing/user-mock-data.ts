import type { UseUserReturn } from "@/hooks/user/useUser";

export function getTypistUser(): NonNullable<UseUserReturn> {
  return {
    needs_password_change: false,
    role: "typist_gsb",
    roleWithoutCommitteeCategory: "typist",
    user_id: 1,
    username: "testuser",
  };
}

export function getCoordinatorUser(election: "csb" | "gsb" = "gsb"): NonNullable<UseUserReturn> {
  return {
    needs_password_change: false,
    role: `coordinator_${election}`,
    roleWithoutCommitteeCategory: "coordinator",
    user_id: 2,
    username: "testcoordinator",
  };
}

export function getAdminUser(): NonNullable<UseUserReturn> {
  return {
    needs_password_change: false,
    role: "administrator",
    roleWithoutCommitteeCategory: "administrator",
    user_id: 3,
    username: "testadministrator",
  };
}
