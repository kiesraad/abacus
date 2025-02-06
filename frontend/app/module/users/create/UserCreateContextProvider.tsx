import * as React from "react";
import { useState } from "react";

import { ListedUser } from "@kiesraad/api";

import { IUserCreateContext, UserCreateContext } from "./UserCreateContext";

export function UserCreateContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Partial<ListedUser>>({});

  function updateUser(update: Partial<ListedUser>) {
    setUser((user) => ({ ...user, ...update }));
  }

  const context: IUserCreateContext = { user, updateUser };
  return <UserCreateContext.Provider value={context}>{children}</UserCreateContext.Provider>;
}
