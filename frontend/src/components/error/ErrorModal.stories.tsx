import { Story } from "@ladle/react";

import { ErrorModal } from "@/components/error/ErrorModal";

import { ApiError, ApiResponseStatus } from "@kiesraad/api";

export const ServerErrorModal: Story = () => {
  return (
    <ErrorModal
      error={new ApiError(ApiResponseStatus.ServerError, 500, "Internal Server Error", "InternalServerError")}
    />
  );
};
