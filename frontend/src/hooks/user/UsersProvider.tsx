import * as React from "react";

import RequestStateHandler from "@/api/RequestStateHandler";
import { useInitialApiGetWithErrors } from "@/api/useInitialApiGet";
import { t } from "@/i18n/translate";
import { USER_LIST_REQUEST_PATH, UserListResponse } from "@/types/generated/openapi";

import { UsersProviderContext } from "./UsersProviderContext";

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const path: USER_LIST_REQUEST_PATH = "/api/user";
  const { requestState } = useInitialApiGetWithErrors<UserListResponse>(path);

  return (
    <RequestStateHandler
      requestState={requestState}
      notFoundMessage="error.not_found"
      renderOnSuccess={({ users }) => {
        function getName(userId?: number, fallback = t("user")) {
          if (userId === undefined) {
            return fallback;
          }

          const user = users.find(({ id }) => userId === id);
          return user?.fullname ?? user?.username ?? fallback;
        }

        return <UsersProviderContext.Provider value={{ users, getName }}>{children}</UsersProviderContext.Provider>;
      }}
    />
  );
}
