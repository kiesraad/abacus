import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { ApiProvider } from "@kiesraad/api";

// ignore in prod
import { startMockAPI } from "./msw-mock-api";
import { routes } from "./routes";

const rootDiv = document.getElementById("root");

if (!rootDiv) {
  throw new Error("Root div not found");
}

const root = createRoot(rootDiv);

function render() {
  const router = createBrowserRouter(routes);

  root.render(
    <StrictMode>
      <ApiProvider>
        <RouterProvider router={router} />
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
