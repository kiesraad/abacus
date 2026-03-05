import { type ReactNode, useState } from "react";
import type { Role } from "@/types/generated/openapi";
import {
  type CommitteeCategory,
  type IUserCreateContext,
  type RoleWithoutCommitteeCategory,
  UserCreateContext,
  type UserType,
} from "../../hooks/UserCreateContext";

export function UserCreateContextProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<RoleWithoutCommitteeCategory | undefined>(undefined);
  const [committeeCategory, setCommitteeCategory] = useState<CommitteeCategory | undefined>(undefined);
  const [type, setType] = useState<UserType | undefined>(undefined);

  let fullRole: Role | undefined;
  if (role === "administrator") {
    fullRole = "administrator";
  } else if (role && committeeCategory) {
    fullRole = `${role}_${committeeCategory}`;
  }

  const context: IUserCreateContext = {
    role,
    setRole,
    committeeCategory,
    setCommitteeCategory,
    fullRole,
    type,
    setType,
  };
  return <UserCreateContext.Provider value={context}>{children}</UserCreateContext.Provider>;
}
