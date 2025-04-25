import * as React from "react";
import { useState } from "react";

import { Role } from "@/types/generated/openapi";

import { IUserCreateContext, UserCreateContext, UserType } from "../../hooks/UserCreateContext";

export function UserCreateContextProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [type, setType] = useState<UserType | undefined>(undefined);

  const context: IUserCreateContext = { role, setRole, type, setType };
  return <UserCreateContext.Provider value={context}>{children}</UserCreateContext.Provider>;
}
