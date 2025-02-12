import { createContext } from "react";

import { Role } from "@kiesraad/api";

export type UserType = "fullname" | "anonymous";

export interface CreateUser {
  role?: Role;
  type?: UserType;
  username?: string;
  fullname?: string;
  password?: string;
}

export interface IUserCreateContext {
  user: CreateUser;
  updateUser: (user: CreateUser) => void;
}

export const UserCreateContext = createContext<IUserCreateContext | undefined>(undefined);
