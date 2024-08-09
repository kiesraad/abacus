import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ApiProvider } from "@kiesraad/api";

// ignore in prod
import { startMockAPI } from "./msw-mock-api";
import { routes } from "./routes";

const rootDiv = document.getElementById("root");
if (!rootDiv) throw new Error("Root div not found");

const root = createRoot(rootDiv);

function render() {
  const router = createBrowserRouter(routes, {
    future: {
      v7_normalizeFormMethod: true,
    },
  });

  root.render(
    <StrictMode>
      <ApiProvider host={process.env.API_HOST || ""}>
        <RouterProvider router={router} />
      </ApiProvider>
    </StrictMode>,
  );
}

if (process.env.MSW) {
  startMockAPI()
    .then(render)
    .catch((e: unknown) => {
      console.error(e);
    });
} else {
  render();
}
