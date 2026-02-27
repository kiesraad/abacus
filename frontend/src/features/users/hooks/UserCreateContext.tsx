import { createContext } from "react";

import type { Role } from "@/types/generated/openapi";
import type { RoleWithoutElection } from "@/utils/role";

export type Election = "csb" | "gsb";
export type UserType = "fullname" | "anonymous";

export interface IUserCreateContext {
  role?: RoleWithoutElection;
  setRole: (role: RoleWithoutElection) => void;
  election?: Election;
  setElection: (election: Election) => void;
  fullRole?: Role;
  type?: UserType;
  setType: (type: UserType) => void;
}

export const UserCreateContext = createContext<IUserCreateContext | undefined>(undefined);
