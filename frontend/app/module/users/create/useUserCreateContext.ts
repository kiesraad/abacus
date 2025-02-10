import { useContext } from "react";

import { UserCreateContext } from "./UserCreateContext";

export function useUserCreateContext() {
  const context = useContext(UserCreateContext);

  if (!context) {
    throw new Error("useUserCreateContext must be used within an UserCreateContextProvider");
  }

  return context;
}
