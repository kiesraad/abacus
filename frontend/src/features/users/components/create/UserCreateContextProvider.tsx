import { type ReactNode, useState } from "react";

import type { Role } from "@/types/generated/openapi";

import { type IUserCreateContext, UserCreateContext, type UserType } from "../../hooks/UserCreateContext";

export function UserCreateContextProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | undefined>(undefined);
  const [type, setType] = useState<UserType | undefined>(undefined);

  const context: IUserCreateContext = { role, setRole, type, setType };
  return <UserCreateContext.Provider value={context}>{children}</UserCreateContext.Provider>;
}
