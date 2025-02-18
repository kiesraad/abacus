import * as React from "react";
import { useState } from "react";

import { ApiResult, CreateUserRequest, Role, useCrud, User, USER_CREATE_REQUEST_PATH } from "@kiesraad/api";

import { IUserCreateContext, UserCreateContext, UserDetails, UserType } from "./UserCreateContext";

export function UserCreateContextProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [type, setType] = useState<UserType | undefined>(undefined);
  const [username, setUsername] = useState<string | undefined>(undefined);

  const url: USER_CREATE_REQUEST_PATH = "/api/user";
  const userApi = useCrud<User>(url);

  async function createUser(userDetails: UserDetails): Promise<ApiResult<User>> {
    if (!role) {
      throw new Error("Role was not set");
    }

    setUsername(userDetails.username);
    return userApi.create({ role, ...userDetails } satisfies CreateUserRequest);
  }

  const apiError = userApi.requestState.status === "api-error" ? userApi.requestState.error : null;
  const loading = userApi.requestState.status === "loading";

  const context: IUserCreateContext = { role, setRole, type, setType, createUser, username, apiError, loading };
  return <UserCreateContext.Provider value={context}>{children}</UserCreateContext.Provider>;
}
