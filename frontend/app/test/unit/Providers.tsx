import * as React from "react";
import { RouterProvider } from "react-router-dom";

import type { Router as RemixRouter } from "@remix-run/router/dist/router";

import { ApiProvider } from "@kiesraad/api";

import { getRouter } from "./router";

export const Providers = ({
  children,
  router = getRouter(children),
}: {
  children?: React.ReactNode;
  router?: RemixRouter;
}) => {
  return (
    <ApiProvider host="http://testhost">
      <RouterProvider router={router} />
    </ApiProvider>
  );
};
