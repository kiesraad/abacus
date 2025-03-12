import { ReactNode } from "react";

import { ApiClient } from "./ApiClient";
import { ApiProviderContext, ApiState } from "./ApiProviderContext";
import { Role } from "./gen/openapi";

interface TestUserProviderProps {
  userRole: Role;
  children: ReactNode;
}

export function TestUserProvider({ userRole, children }: TestUserProviderProps) {
  const apiState = {
    client: new ApiClient(),
    user: {
      user_id: 1,
      role: userRole,
      fullname: "Test User",
      username: "test",
    },
  };

  return <ApiProviderContext.Provider value={apiState as unknown as ApiState}>{children}</ApiProviderContext.Provider>;
}
