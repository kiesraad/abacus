import { useContext } from "react";

import { UsersProviderContext } from "./UsersProviderContext";

export function useUsers() {
  const context = useContext(UsersProviderContext);

  if (!context) {
    throw new Error("useUsers must be used within an UsersProvider");
  }

  return context;
}
