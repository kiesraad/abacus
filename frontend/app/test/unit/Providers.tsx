import * as React from "react";
import { RouterProvider } from "react-router-dom";

import { ApiProvider } from "@kiesraad/api";

import { getRouter } from "./router";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const router = getRouter(children);
  return (
    <ApiProvider host="http://testhost">
      <RouterProvider router={router} />
    </ApiProvider>
  );
};
