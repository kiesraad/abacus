import { useRouteError } from "react-router-dom";

import { NotFound } from "app/module/NotFound";

export function ErrorBoundary() {
  const error = useRouteError();

  if (error) {
    console.error(error);
  }

  return <NotFound />;
}
