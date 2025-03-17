import { ReactNode } from "react";

import { ApiResult, ApiState } from "./api.types";
import { ApiClient } from "./ApiClient";
import { ApiProviderContext } from "./ApiProviderContext";
import { LoginResponse, Role } from "./gen/openapi";

interface TestUserProviderProps {
  userRole: Role;
  children: ReactNode;
  overrideExpiration?: Date;
}

export function TestUserProvider({ userRole, children, overrideExpiration }: TestUserProviderProps) {
  let expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 30);

  if (overrideExpiration) {
    expiration = overrideExpiration;
  }

  const apiState: ApiState = {
    client: new ApiClient(),
    setUser: () => {},
    user: {
      user_id: 1,
      role: userRole,
      needs_password_change: false,
      fullname: "Test User",
      username: "test",
    },
    logout: async () => {},
    login: async () => {
      return Promise.resolve({} as ApiResult<LoginResponse>);
    },
    loading: false,
    expiration,
    extendSession: function (): Promise<void> {
      expiration.setMinutes(expiration.getMinutes() + 30);

      return Promise.resolve();
    },
  };

  return <ApiProviderContext.Provider value={apiState}>{children}</ApiProviderContext.Provider>;
}
