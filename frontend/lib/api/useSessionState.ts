import { useEffect, useState } from "react";

import { ApiClient, DEFAULT_CANCEL_REASON } from "./ApiClient";
import { isSuccess } from "./ApiError";
import { LoginResponse, WHOAMI_REQUEST_PATH } from "./gen/openapi";

export interface SessionState {
  user: LoginResponse | null;
  setUser: (user: LoginResponse | null) => void;
}

// Keep track of the currently logged-in user
// By initially fetching the user data from the server
// and then updating it when the user logs in or out
export default function useSessionState(initialUser: boolean): SessionState {
  const [user, setUser] = useState<LoginResponse | null>(null);

  useEffect(() => {
    if (initialUser) {
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
  }, [initialUser]);

  return { user, setUser };
}
