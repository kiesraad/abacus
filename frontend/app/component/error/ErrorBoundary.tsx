import { useRouteError } from "react-router-dom";

import { FatalError } from "app/module/FatalError";
import { NotFound } from "app/module/NotFound";

import { ApiError, NetworkError, NotFoundError } from "@kiesraad/api";

export function ErrorBoundary() {
  const error = useRouteError() as Error;

  // debug print the error to the console
  console.error(error);

  if (error instanceof NotFoundError) {
    return <NotFound message={error.message} path={error.path} />;
  }

  if (error instanceof NetworkError) {
    return <FatalError message={error.message} />;
  }

  if (error instanceof ApiError) {
    return <FatalError message={error.message} reference={error.reference} code={error.code} />;
  }

  return <FatalError message={error.message} error={error} />;
}
