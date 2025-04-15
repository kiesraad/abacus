import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import { ApiProvider } from "@/api/ApiProvider";
import "@/styles/index.css";

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
  // import msw-mock-api here instead of at the top of the file,
  // so that we only use MSW in development and don't need it in production
  import("./msw-mock-api")
    .then((mockAPI) =>
      mockAPI
        .startMockAPI()
        .then(render)
        .catch((e: unknown) => {
          console.error(e);
        }),
    )
    .catch((e: unknown) => {
      console.error(e);
    });
} else {
  render();
}
