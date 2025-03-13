import { ReactNode } from "react";

import { Loader } from "@kiesraad/ui";

import { TranslationPath } from "@/utils/i18n/i18n.types";

import { NotFoundError } from "./ApiError";
import { ApiRequestState } from "./useApiRequest";

interface RequestStateHandlerProps<T> {
  requestState: ApiRequestState<T>;
  renderOnSuccess: (data: T) => ReactNode;
  notFoundMessage?: TranslationPath;
  isFoundCheck?: (data: T) => boolean;
}

export default function RequestStateHandler<T>({
  requestState,
  renderOnSuccess,
  notFoundMessage,
  isFoundCheck,
}: RequestStateHandlerProps<T>) {
  if (requestState.status === "loading") {
    return <Loader />;
  }

  if (requestState.status === "not-found-error") {
    if (notFoundMessage) {
      throw requestState.error.withMessage(notFoundMessage);
    }

    throw requestState.error;
  }

  if (
    requestState.status === "api-error" ||
    requestState.status === "network-error" ||
    requestState.status === "fatal-api-error"
  ) {
    throw requestState.error;
  }

  if (isFoundCheck && !isFoundCheck(requestState.data)) {
    throw new NotFoundError(notFoundMessage || "error.not_found");
  }

  return renderOnSuccess(requestState.data);
}
