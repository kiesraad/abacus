import * as React from "react";
import { useState } from "react";

import { User } from "@kiesraad/api";

import { IUserCreateContext, UserCreateContext } from "./UserCreateContext";

export function UserCreateContextProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Partial<User>>({});

  function updateUser(update: Partial<User>) {
    setUser((user) => ({ ...user, ...update }));
  }

  const context: IUserCreateContext = { user, updateUser };
  return <UserCreateContext.Provider value={context}>{children}</UserCreateContext.Provider>;
}
