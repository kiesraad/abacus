import { createMemoryRouter } from "react-router-dom";

import { Router } from "@remix-run/router";

export let router: Router;

export function getRouter(children: React.ReactNode) {
  router = createMemoryRouter([{ path: "*", element: children }]);
  return router;
}
