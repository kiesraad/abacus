import { createContext } from "react";

import type { LoginResponse } from "@/types/generated/openapi";

import type { ApiClient } from "./ApiClient";
import type { ApiResult } from "./ApiResult";

export interface ApiState {
  client: ApiClient;
  user: LoginResponse | null;
  setUser: (user: LoginResponse | null) => void;
  logout: () => Promise<ApiResult<null>>;
  login: (username: string, password: string) => Promise<ApiResult<LoginResponse>>;
  loading: boolean;
  expiration: Date | null;
  extendSession: () => Promise<void>;
  airGapError: boolean;
}

export const ApiProviderContext = createContext<ApiState | null>(null);
