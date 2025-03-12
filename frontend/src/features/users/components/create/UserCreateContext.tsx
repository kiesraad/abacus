import { createContext } from "react";

import { ApiError, ApiResult } from "@/api";
import { CreateUserRequest, Role, User } from "@/types/generated/openapi";

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
