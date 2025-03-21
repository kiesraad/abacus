import { createContext } from "react";

import type { Role } from "@kiesraad/api";

export type UserType = "fullname" | "anonymous";

export interface IUserCreateContext {
  role?: Role;
  setRole: (role: Role) => void;
  type?: UserType;
  setType: (type: UserType) => void;
}

export const UserCreateContext = createContext<IUserCreateContext | undefined>(undefined);
