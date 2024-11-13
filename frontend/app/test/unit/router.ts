import { createMemoryRouter } from "react-router-dom";

import { Router } from "@remix-run/router";

export let router: Router;

export function getRouter(children: React.ReactNode) {
  router = createMemoryRouter([{ path: "*", element: children }], {
    future: {
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_relativeSplatPath: true,
      v7_skipActionErrorRevalidation: true,
    },
  });
  return router;
}
