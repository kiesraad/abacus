import * as React from "react";
import { useState } from "react";

import { ApiResult, useCrud } from "@/api";
import { CreateUserRequest, Role, User, USER_CREATE_REQUEST_PATH } from "@/types/generated/openapi";

import { IUserCreateContext, UserCreateContext, UserType } from "./UserCreateContext";

export function UserCreateContextProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [type, setType] = useState<UserType | undefined>(undefined);
  const [username, setUsername] = useState<string | undefined>(undefined);

  const url: USER_CREATE_REQUEST_PATH = "/api/user";
  const userApi = useCrud<User>(url);

  async function createUser(user: CreateUserRequest): Promise<ApiResult<User>> {
    setUsername(user.username);
    return userApi.create(user);
  }

  const apiError = userApi.requestState.status === "api-error" ? userApi.requestState.error : null;
  const saving = userApi.requestState.status === "loading";

  const context: IUserCreateContext = { role, setRole, type, setType, createUser, username, apiError, saving };
  return <UserCreateContext.Provider value={context}>{children}</UserCreateContext.Provider>;
}
