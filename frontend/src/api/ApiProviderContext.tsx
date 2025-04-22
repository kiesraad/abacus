import { createContext } from "react";

import { LoginResponse } from "@/types/generated/openapi";

import { ApiClient } from "./ApiClient";
import { ApiResult } from "./ApiResult";

export interface ApiState {
  client: ApiClient;
  user: LoginResponse | null;
  setUser: (user: LoginResponse | null) => void;
  logout: () => Promise<void>;
  login: (username: string, password: string) => Promise<ApiResult<LoginResponse>>;
  loading: boolean;
  expiration: Date | null;
  extendSession: () => Promise<void>;
}

export const ApiProviderContext = createContext<ApiState | null>(null);
