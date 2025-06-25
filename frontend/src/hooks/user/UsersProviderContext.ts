import { createContext } from "react";

import { User } from "@/types/generated/openapi";

export interface iUsersProviderContext {
  users: User[];
  getName: (userId?: number, fallback?: string) => string;
}

export const UsersProviderContext = createContext<iUsersProviderContext | undefined>(undefined);
