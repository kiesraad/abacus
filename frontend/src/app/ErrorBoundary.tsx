import { Navigate, useRouteError } from "react-router";

import { NotFoundPage } from "@/app/NotFoundPage";

import { ApiError, FatalApiError, NetworkError, NotFoundError } from "@kiesraad/api";

import { FatalErrorPage } from "./FatalErrorPage";

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
