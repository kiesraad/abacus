import { useRouteError } from "react-router-dom";

import { FatalErrorPage } from "app/module/FatalErrorPage";
import { NotFoundPage } from "app/module/NotFoundPage";

import { ApiError, FatalApiError, NetworkError, NotFoundError } from "@kiesraad/api";

export function ErrorBoundary() {
  const error = useRouteError() as Error;

  // debug print the error to the console
  console.error(error);

  if (error instanceof NotFoundError) {
    return <NotFoundPage message={error.message} path={error.path} />;
  }

  if (error instanceof NetworkError) {
    return <FatalErrorPage message={error.message} />;
  }

  if (error instanceof ApiError || error instanceof FatalApiError) {
    return <FatalErrorPage message={error.message} reference={error.reference} code={error.code} />;
  }

  return <FatalErrorPage message={error.message} error={error} />;
}
