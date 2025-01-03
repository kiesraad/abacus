import * as React from "react";
import { RouterProvider } from "react-router-dom";

import { ApiProvider } from "@kiesraad/api";

import { getRouter, Router } from "./router";

export const Providers = ({
  children,
  router = getRouter(children),
}: {
  children?: React.ReactNode;
  router?: Router;
}) => {
  return (
    <ApiProvider>
      <RouterProvider router={router} />
    </ApiProvider>
  );
};
