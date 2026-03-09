import { createContext } from "react";

import type { Role } from "@/types/generated/openapi";

export const roleWithoutCommitteeCategoryValues = ["administrator", "coordinator", "typist"] as const;
export type RoleWithoutCommitteeCategory = (typeof roleWithoutCommitteeCategoryValues)[number];

export function isRoleWithoutCommitteeCategory(value: string): value is RoleWithoutCommitteeCategory {
  return (roleWithoutCommitteeCategoryValues as readonly string[]).includes(value);
}

export type CommitteeCategory = "csb" | "gsb";
export type UserType = "fullname" | "anonymous";

export interface IUserCreateContext {
  role?: RoleWithoutCommitteeCategory;
  setRole: (role: RoleWithoutCommitteeCategory) => void;
  committeeCategory?: CommitteeCategory;
  setCommitteeCategory: (committeeCategory: CommitteeCategory) => void;
  fullRole?: Role;
  type?: UserType;
  setType: (type: UserType) => void;
}

export const UserCreateContext = createContext<IUserCreateContext | undefined>(undefined);
