import { useEffect, useState } from "react";

import { AnyApiError, ApiResult } from "./api.types";
import { ApiClient, DEFAULT_CANCEL_REASON } from "./ApiClient";
import { isSuccess } from "./ApiError";
import {
  LOGIN_REQUEST_BODY,
  LOGIN_REQUEST_PATH,
  LoginResponse,
  LOGOUT_REQUEST_PATH,
  WHOAMI_REQUEST_PATH,
} from "./gen/openapi";

export interface SessionState {
  user: LoginResponse | null;
  setUser: (user: LoginResponse | null) => void;
  logout: () => Promise<void>;
  login: (username: string, password: string) => Promise<ApiResult<LoginResponse>>;
}

// Keep track of the currently logged-in user
// By initially fetching the user data from the server
// and then updating it when the user logs in or out
export default function useSessionState(fetchInitialUser: boolean): SessionState {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [error, setError] = useState<AnyApiError | null>(null);

  // Propagate any unexpected API errors to the router
  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  // Log out the current user
  const logout = async () => {
    const path: LOGOUT_REQUEST_PATH = "/api/user/logout";
    const client = new ApiClient();
    const response = await client.postRequest(path);

    if (isSuccess(response)) {
      setUser(null);
    } else {
      setError(response);
    }
  };

  // Log in the user with the given credentials
  const login = async (username: string, password: string) => {
    const requestPath: LOGIN_REQUEST_PATH = "/api/user/login";
    const requestBody: LOGIN_REQUEST_BODY = { username, password };
    const client = new ApiClient();
    const response = await client.postRequest<LoginResponse>(requestPath, requestBody);

    if (isSuccess(response)) {
      setUser(response.data);
    }

    return response;
  };

  // Fetch the user data from the server when the component mounts
  useEffect(() => {
    if (fetchInitialUser) {
      const abortController = new AbortController();

      void (async () => {
        const path: WHOAMI_REQUEST_PATH = "/api/user/whoami";
        const client = new ApiClient();
        const response = await client.getRequest<LoginResponse>(path, abortController);

        if (isSuccess(response)) {
          setUser(response.data);
        } else {
          setUser(null);
        }
      })();

      return () => {
        abortController.abort(DEFAULT_CANCEL_REASON);
      };
    }
  }, [fetchInitialUser]);

  return { user, setUser, login, logout };
}
