import type { ReactNode } from "react";
import { RouterProvider } from "react-router";

import { ApiProvider } from "@/api/ApiProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import { TestUserProvider } from "@/testing/TestUserProvider";
import type { Role } from "@/types/generated/openapi";
import { getRouter, type Router } from "./router";

export const Providers = ({
  children,
  router = getRouter(children),
  fetchInitialUser = false,
  userRole,
}: {
  children?: ReactNode;
  router?: Router;
  fetchInitialUser?: boolean;
  userRole?: Role;
}) => {
  const routerProvider = <RouterProvider router={router} />;
  return (
    <ApiProvider fetchInitialUser={fetchInitialUser}>
      <MessagesProvider>
        {userRole ? <TestUserProvider userRole={userRole}>{routerProvider}</TestUserProvider> : routerProvider}
      </MessagesProvider>
    </ApiProvider>
  );
};
