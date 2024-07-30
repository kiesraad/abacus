import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ApiProvider, ElectionListProvider } from "@kiesraad/api";

// ignore in prod
import { startMockAPI } from "./msw-mock-api.ts";
import { routes } from "./routes.tsx";

const rootDiv = document.getElementById("root");
if (!rootDiv) throw new Error("Root div not found");

const root = ReactDOM.createRoot(rootDiv);

function render() {
  const router = createBrowserRouter(routes, {
    future: {
      v7_normalizeFormMethod: true,
    },
  });

  root.render(
    <StrictMode>
      <ApiProvider host={process.env.API_HOST || ""}>
        <ElectionListProvider>
          <RouterProvider router={router} />
        </ElectionListProvider>
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
