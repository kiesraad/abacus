import { createContext } from "react";

import { ApiError, ApiResult, CreateUserRequest, Role, User } from "@kiesraad/api";

export type UserType = "fullname" | "anonymous";
export type UserDetails = Omit<CreateUserRequest, "role">;

export interface IUserCreateContext {
  role?: Role;
  setRole: (role: Role) => void;
  type?: UserType;
  setType: (type: UserType) => void;
  createUser: (user: UserDetails) => Promise<ApiResult<User>>;
  username?: string;
  apiError: ApiError | null;
  loading: boolean;
}

export const UserCreateContext = createContext<IUserCreateContext | undefined>(undefined);
