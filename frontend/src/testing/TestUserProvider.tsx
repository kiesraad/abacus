import { ReactNode } from "react";

import { ApiClient } from "@/api/ApiClient";
import { ApiProviderContext, ApiState } from "@/api/ApiProviderContext";
import { ApiResult } from "@/api/ApiResult";
import { LoginResponse, Role } from "@/types/generated/openapi";

interface TestUserProviderProps {
  userRole: Role | null;
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
    user: userRole
      ? {
          user_id: 1,
          role: userRole,
          needs_password_change: false,
          fullname: "Test User",
          username: "test",
        }
      : null,
    logout: async () => {
      return Promise.resolve({} as ApiResult<null>);
    },
    login: async () => {
      return Promise.resolve({} as ApiResult<LoginResponse>);
    },
    loading: false,
    airGapError: false,
    expiration,
    extendSession: (): Promise<void> => {
      expiration.setMinutes(expiration.getMinutes() + 30);

      return Promise.resolve();
    },
  };

  return <ApiProviderContext.Provider value={apiState}>{children}</ApiProviderContext.Provider>;
}
