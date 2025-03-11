import * as React from "react";
import { useState } from "react";

import type { Role } from "@kiesraad/api";

import { IUserCreateContext, UserCreateContext, UserType } from "./UserCreateContext";

export function UserCreateContextProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [type, setType] = useState<UserType | undefined>(undefined);

  const context: IUserCreateContext = { role, setRole, type, setType };
  return <UserCreateContext.Provider value={context}>{children}</UserCreateContext.Provider>;
}
