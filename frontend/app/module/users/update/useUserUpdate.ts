import { useState } from "react";

import { AnyApiError, isSuccess, useCrud, User, USER_UPDATE_REQUEST_PATH } from "@kiesraad/api";

export function useUserUpdate(userId: number) {
  const [error, setError] = useState<AnyApiError>();
  const api = useCrud<User>(`/api/user/${userId}` satisfies USER_UPDATE_REQUEST_PATH);

  const saving = api.requestState.status === "loading";

  function remove(): Promise<void> {
    return api.remove().then((result) => {
      if (!isSuccess(result)) {
        setError(result);
        window.scrollTo(0, 0);

        // Do not resolve Promise, error has been handled
        throw result;
      }
    });
  }

  return { error, remove, saving };
}
