import { Navigate, useRouteError } from "react-router";

import { ApiError, FatalApiError, NetworkError, NotFoundError } from "@/api/ApiResult";

import { FatalErrorPage } from "./FatalErrorPage";
import { NotFoundPage } from "./NotFoundPage";

export function ErrorBoundary() {
  const error = useRouteError() as Error;

  // redirect to login page if the user is not authenticated
  if (error instanceof ApiError && error.code === 401) {
    // redirect to login page
    return <Navigate to="/account/login" state={{ unauthorized: true }} />;
  }

  // debug print the error to the console
  console.error(error);

  if (error instanceof NotFoundError) {
    return <NotFoundPage message={error.message} vars={error.vars} path={error.path} />;
  }

  if (error instanceof NetworkError) {
    return <FatalErrorPage message={error.message} />;
  }

  if (error instanceof ApiError || error instanceof FatalApiError) {
    return <FatalErrorPage message={error.message} reference={error.reference} code={error.code} />;
  }

  return <FatalErrorPage message={error.message} error={error} />;
}
