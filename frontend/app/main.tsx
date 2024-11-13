import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ApiProvider } from "@kiesraad/api";

import { NotFoundError } from "./component/error";
// ignore in prod
import { startMockAPI } from "./msw-mock-api";
import { routes } from "./routes";

const rootDiv = document.getElementById("root");

if (!rootDiv) {
  throw new NotFoundError("Root div not found");
}

const root = createRoot(rootDiv);

function render() {
  const router = createBrowserRouter(routes, {
    future: {
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_relativeSplatPath: true,
      v7_skipActionErrorRevalidation: true,
    },
  });

  root.render(
    <StrictMode>
      <ApiProvider>
        <RouterProvider
          router={router}
          future={{
            v7_startTransition: true,
          }}
        />
      </ApiProvider>
    </StrictMode>,
  );
}

if (__API_MSW__) {
  startMockAPI()
    .then(render)
    .catch((e: unknown) => {
      console.error(e);
    });
} else {
  render();
}
