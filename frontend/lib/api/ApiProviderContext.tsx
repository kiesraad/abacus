import { createContext } from "react";

import type { ApiClient, ApiResult, LoginResponse } from "@kiesraad/api";

export interface ApiState {
  client: ApiClient;
  user: LoginResponse | null;
  setUser: (user: LoginResponse | null) => void;
  logout: () => Promise<void>;
  login: (username: string, password: string) => Promise<ApiResult<LoginResponse>>;
}

export const ApiProviderContext = createContext<ApiState | null>(null);
