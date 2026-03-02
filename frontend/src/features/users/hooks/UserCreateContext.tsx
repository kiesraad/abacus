import { createContext } from "react";

import type { Role } from "@/types/generated/openapi";
import type { RoleWithoutCommitteeCategory } from "@/utils/role";

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
