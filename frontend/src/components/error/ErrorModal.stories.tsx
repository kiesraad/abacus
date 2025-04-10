import { Story } from "@ladle/react";

import { ErrorModal } from "@/components/error/ErrorModal";

import { ApiError, ApiResponseStatus, NetworkError } from "@kiesraad/api";

export const ServerErrorModal: Story = () => {
  return (
    <ErrorModal
      error={new ApiError(ApiResponseStatus.ServerError, 500, "Internal Server Error", "InternalServerError")}
    />
  );
};

export const UnknownServerErrorModal: Story = () => {
  return (
    <ErrorModal
      // we need to disable the linter to test the method with an unknown translation key
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      error={new ApiError(ApiResponseStatus.ServerError, 543, "Unknown Server Error", "UnknownServerError")}
    />
  );
};

export const NetworkErrorModal: Story = () => {
  return <ErrorModal error={new NetworkError("Network errors are the worst")} />;
};
