import * as React from "react";
import { RouterProvider } from "react-router";

import { ApiProvider } from "@kiesraad/api";

import { getRouter, Router } from "./router";

export const Providers = ({
  children,
  router = getRouter(children),
  initialUser = false,
}: {
  children?: React.ReactNode;
  router?: Router;
  initialUser?: boolean;
}) => {
  return (
    <ApiProvider initialUser={initialUser}>
      <RouterProvider router={router} />
    </ApiProvider>
  );
};
