import type { ReactNode } from "react";
import { RouterProvider } from "react-router";

import { ApiProvider } from "@/api/ApiProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import { getRouter, type Router } from "./router";

export const Providers = ({
  children,
  router = getRouter(children),
  fetchInitialUser = false,
}: {
  children?: ReactNode;
  router?: Router;
  fetchInitialUser?: boolean;
}) => {
  return (
    <ApiProvider fetchInitialUser={fetchInitialUser}>
      <MessagesProvider>
        <RouterProvider router={router} />
      </MessagesProvider>
    </ApiProvider>
  );
};
