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

export const roleWithoutCommitteeCategoryValues = ["administrator", "coordinator", "typist"] as const;
export type RoleWithoutCommitteeCategory = (typeof roleWithoutCommitteeCategoryValues)[number];

export function isRoleWithoutCommitteeCategory(value: string): value is RoleWithoutCommitteeCategory {
  return (roleWithoutCommitteeCategoryValues as readonly string[]).includes(value);
}

export function roleWithoutCommitteeCategory(role: Role): RoleWithoutCommitteeCategory {
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
