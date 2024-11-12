import { Translation } from "@kiesraad/i18n";
import { Loader } from "@kiesraad/ui";

import { NotFoundError } from "./ApiError";
import { ApiRequestState } from "./useApiRequest";

interface RequestStateHandlerrops<T> {
  requestState: ApiRequestState<T>;
  renderOnSuccess: (data: T) => React.ReactNode;
  notFoundMessage?: keyof Translation;
  isFoundCheck?: (data: T) => boolean;
}

export default function RequestStateHandler<T>({
  requestState,
  renderOnSuccess,
  notFoundMessage,
  isFoundCheck,
}: RequestStateHandlerrops<T>) {
  if (requestState.status === "loading") {
    return <Loader />;
  }

  if (requestState.status === "not-found-error") {
    if (notFoundMessage) {
      throw requestState.error.withMessage(notFoundMessage);
    }

    throw requestState.error;
  }

  if (requestState.status === "api-error" || requestState.status === "network-error") {
    throw requestState.error;
  }

  if (isFoundCheck && !isFoundCheck(requestState.data)) {
    throw new NotFoundError(notFoundMessage || "error.not_found");
  }

  return renderOnSuccess(requestState.data);
}
