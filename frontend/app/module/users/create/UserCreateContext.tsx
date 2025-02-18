import { createContext } from "react";

import { ApiError, ApiResult, CreateUserRequest, Role, User } from "@kiesraad/api";

export type UserType = "fullname" | "anonymous";

export interface IUserCreateContext {
  role?: Role;
  setRole: (role: Role) => void;
  type?: UserType;
  setType: (type: UserType) => void;
  createUser: (user: CreateUserRequest) => Promise<ApiResult<User>>;
  username?: string;
  apiError: ApiError | null;
  saving: boolean;
}

export const UserCreateContext = createContext<IUserCreateContext | undefined>(undefined);
