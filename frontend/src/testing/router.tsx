import { ReactNode } from "react";
import { createMemoryRouter, useRouteError } from "react-router";

export type Router = ReturnType<typeof createMemoryRouter>;

// Render a small html document with the error, for easier vitest debugging
function ErrorBoundary() {
  const error = useRouteError() as Error;
  return <>Error thrown during render: {error.message}</>;
}

export function getRouter(children: ReactNode) {
  return createMemoryRouter([{ path: "*", element: children, errorElement: <ErrorBoundary /> }]);
}
