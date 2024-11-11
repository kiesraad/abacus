import { NotFoundError } from "app/component/error";

import { Translation } from "@kiesraad/i18n";
import { Loader } from "@kiesraad/ui";

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

  if (requestState.status === "api-error") {
    if (requestState.error.code === 404) {
      throw new NotFoundError(notFoundMessage || "error.not_found");
    }

    throw requestState.error;
  }

  if (requestState.status === "network-error") {
    throw requestState.error;
  }

  if (isFoundCheck && !isFoundCheck(requestState.data)) {
    throw new NotFoundError(notFoundMessage || "error.not_found");
  }

  return renderOnSuccess(requestState.data);
}
