import { ReactNode } from "react";

import { t } from "@/i18n/translate";

import { UsersProviderContext } from "../hooks/user/UsersProviderContext";
import { userMockData } from "./api-mocks/UserMockData";

export function TestUsersProvider({ children }: { children: ReactNode }) {
  function getName(userId?: number, fallback = t("user")) {
    if (userId === undefined) {
      return fallback;
    }

    const user = userMockData.find(({ id }) => userId === id);
    return user?.fullname ?? user?.username ?? fallback;
  }

  return (
    <UsersProviderContext.Provider value={{ users: userMockData, getName }}>{children}</UsersProviderContext.Provider>
  );
}
