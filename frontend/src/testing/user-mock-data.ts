import type { UseUserReturn } from "@/hooks/user/useUser";

export function getTypistUser(): UseUserReturn {
  return {
    needs_password_change: false,
    role: "typist_gsb",
    roleWithoutElection: "typist",
    user_id: 1,
    username: "testuser",
  };
}

export function getCoordinatorUser(): UseUserReturn {
  return {
    needs_password_change: false,
    role: "coordinator_gsb",
    roleWithoutElection: "coordinator",
    user_id: 2,
    username: "testcoordinator",
  };
}

export function getAdminUser(): UseUserReturn {
  return {
    needs_password_change: false,
    role: "administrator",
    roleWithoutElection: "administrator",
    user_id: 3,
    username: "testadministrator",
  };
}
