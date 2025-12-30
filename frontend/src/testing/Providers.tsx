import type { ReactNode } from "react";
import { RouterProvider } from "react-router";

import { ApiProvider } from "@/api/ApiProvider";

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
      <RouterProvider router={router} />
    </ApiProvider>
  );
};
