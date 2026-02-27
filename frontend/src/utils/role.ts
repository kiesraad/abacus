import type { Role } from "@/types/generated/openapi";

export function isAdministrator(role?: Role) {
  return role === "administrator";
}

export function isCoordinator(role?: Role) {
  return role === "coordinator_gsb" || role === "coordinator_csb";
}

export function isTypist(role?: Role) {
  return role === "typist_gsb" || role === "typist_csb";
}

export const roleWithoutElectionValues = ["administrator", "coordinator", "typist"] as const;
export type RoleWithoutElection = (typeof roleWithoutElectionValues)[number];

export function isRoleWithoutElection(value: string): value is RoleWithoutElection {
  return (roleWithoutElectionValues as readonly string[]).includes(value);
}

export function roleWithoutElection(role: Role): RoleWithoutElection {
  switch (role) {
    case "administrator":
      return "administrator";
    case "coordinator_gsb":
    case "coordinator_csb":
      return "coordinator";
    case "typist_gsb":
    case "typist_csb":
      return "typist";
  }
}
