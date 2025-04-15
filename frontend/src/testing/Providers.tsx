import * as React from "react";
import { RouterProvider } from "react-router";

import { ApiProvider } from "@/app/ApiProvider";

import { getRouter, Router } from "./router";

export const Providers = ({
  children,
  router = getRouter(children),
  fetchInitialUser = false,
}: {
  children?: React.ReactNode;
  router?: Router;
  fetchInitialUser?: boolean;
}) => {
  return (
    <ApiProvider fetchInitialUser={fetchInitialUser}>
      <RouterProvider router={router} />
    </ApiProvider>
  );
};
