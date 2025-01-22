import { ReactNode } from "react";
import { createMemoryRouter } from "react-router";

export type Router = ReturnType<typeof createMemoryRouter>;

export function getRouter(children: ReactNode) {
  return createMemoryRouter([{ path: "*", element: children }]);
}
