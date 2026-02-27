import { type ReactNode, useState } from "react";
import type { Role } from "@/types/generated/openapi";
import type { RoleWithoutElection } from "@/utils/role";
import {
  type Election,
  type IUserCreateContext,
  UserCreateContext,
  type UserType,
} from "../../hooks/UserCreateContext";

export function UserCreateContextProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<RoleWithoutElection | undefined>(undefined);
  const [election, setElection] = useState<Election | undefined>(undefined);
  const [type, setType] = useState<UserType | undefined>(undefined);

  let fullRole: Role | undefined;
  if (role === "administrator") {
    fullRole = "administrator";
  } else if (role && election) {
    fullRole = `${role}_${election}`;
  }

  const context: IUserCreateContext = { role, setRole, election, setElection, fullRole, type, setType };
  return <UserCreateContext.Provider value={context}>{children}</UserCreateContext.Provider>;
}
