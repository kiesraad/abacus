import { Story } from "@ladle/react";

import { ErrorModal } from "app/component/error/ErrorModal";

import { ApiError, ApiResponseStatus } from "@kiesraad/api";

export const ServerErrorModal: Story = () => {
  return (
    <ErrorModal
      error={
        {
          status: ApiResponseStatus.ServerError,
          code: 500,
          error: "Internal Server Error",
        } as ApiError
      }
    />
  );
};
