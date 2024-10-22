import { useRouteError } from "react-router-dom";

import { FatalError } from "app/module/FatalError";
import { NotFound } from "app/module/NotFound";

import { ApiError } from "@kiesraad/api";

import { NotFoundError } from "./Error.types";

export function ErrorBoundary() {
  const error = useRouteError() as Error;

  if (error instanceof NotFoundError) {
    return <NotFound message={error.message} path={error.path} />;
  }

  if (error instanceof ApiError) {
    return <FatalError message={error.message} code={error.code} />;
  }

  return <FatalError message={error.message} error={error} />;
}
