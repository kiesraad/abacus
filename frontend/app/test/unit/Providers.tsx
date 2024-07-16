import * as React from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ApiProvider } from "@kiesraad/api";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const router = createMemoryRouter([{ path: "*", element: children }]);
  return (
    <ApiProvider host="http://testhost">
      <RouterProvider router={router} />
    </ApiProvider>
  );
};
