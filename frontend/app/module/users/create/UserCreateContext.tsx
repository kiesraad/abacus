import { createContext } from "react";

import { Role } from "@kiesraad/api";

export type UserType = "fullname" | "anonymous";

export interface UserDetails {
  username?: string;
  fullname?: string;
  password?: string;
}

export interface IUserCreateContext {
  role?: Role;
  setRole: (role: Role) => void;
  type?: UserType;
  setType: (type: UserType) => void;
  user: UserDetails;
  updateUser: (user: UserDetails) => void;
}

export const UserCreateContext = createContext<IUserCreateContext | undefined>(undefined);
