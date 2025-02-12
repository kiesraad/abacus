import * as React from "react";
import { useState } from "react";

import { Role } from "@kiesraad/api";

import { IUserCreateContext, UserCreateContext, UserDetails, UserType } from "./UserCreateContext";

export function UserCreateContextProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [type, setType] = useState<UserType | undefined>(undefined);
  const [user, setUser] = useState<UserDetails>({});

  function updateUser(update: UserDetails) {
    setUser((user) => ({ ...user, ...update }));
  }

  const context: IUserCreateContext = { role, setRole, type, setType, user, updateUser };
  return <UserCreateContext.Provider value={context}>{children}</UserCreateContext.Provider>;
}
