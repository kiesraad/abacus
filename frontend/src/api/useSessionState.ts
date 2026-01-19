import { useEffect, useState } from "react";

import type {
  ACCOUNT_REQUEST_PATH,
  LOGIN_REQUEST_BODY,
  LOGIN_REQUEST_PATH,
  LOGOUT_REQUEST_PATH,
  LoginResponse,
} from "@/types/generated/openapi";

import { type ApiClient, DEFAULT_CANCEL_REASON } from "./ApiClient";
import { AbortedError, type ApiResult, isSuccess } from "./ApiResult";

export interface SessionState {
  user: LoginResponse | null;
  loading: boolean;
  setUser: (user: LoginResponse | null) => void;
  logout: () => Promise<ApiResult<null>>;
  login: (username: string, password: string) => Promise<ApiResult<LoginResponse>>;
  expiration: Date | null;
  setExpiration: (expiration: Date | null) => void;
  extendSession: () => Promise<void>;
}

// Keep track of the currently logged-in user
// By initially fetching the user data from the server
// and then updating it when the user logs in or out
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export default function useSessionState(client: ApiClient, fetchInitialUser: boolean = true): SessionState {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [expiration, setExpiration] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  // Log out the current user
  const logout = async () => {
    setLoading(true);
    const path: LOGOUT_REQUEST_PATH = "/api/logout";
    const response = await client.postRequest<null>(path);

    if (isSuccess(response)) {
      setUser(null);
    }

    setLoading(false);
    return response;
  };

  // Log in the user with the given credentials
  const login = async (username: string, password: string) => {
    const requestPath: LOGIN_REQUEST_PATH = "/api/login";
    const requestBody: LOGIN_REQUEST_BODY = { username, password };
    const response = await client.postRequest<LoginResponse>(requestPath, requestBody);

    if (isSuccess(response)) {
      setUser(response.data);
    }

    return response;
  };

  const extendSession = async () => {
    const path: ACCOUNT_REQUEST_PATH = "/api/account";
    const response = await client.getRequest<LoginResponse>(path);

    if (isSuccess(response)) {
      setUser(response.data);
    } else {
      setUser(null);
    }
  };

  // Fetch the user data from the server when the component mounts
  useEffect(() => {
    if (fetchInitialUser) {
      const abortController = new AbortController();

      void (async () => {
        const path: ACCOUNT_REQUEST_PATH = "/api/account";
        const response = await client.getRequest<LoginResponse>(path, abortController);

        if (!abortController.signal.aborted && !(response instanceof AbortedError)) {
          if (isSuccess(response)) {
            setUser(response.data);
          } else {
            setUser(null);
          }

          setLoading(false);
        }
      })();

      return () => {
        abortController.abort(DEFAULT_CANCEL_REASON);
      };
    }
  }, [fetchInitialUser, client]);

  return {
    expiration,
    loading,
    login,
    logout,
    setExpiration,
    setUser,
    user,
    extendSession,
  };
}
