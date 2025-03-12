import { Story } from "@ladle/react";

import { ApiError, ApiResponseStatus } from "@/api";

import { ErrorModal } from "./ErrorModal";

export const ServerErrorModal: Story = () => {
  return (
    <ErrorModal
      error={
        {
          status: ApiResponseStatus.ServerError,
          code: 500,
          message: "Internal Server Error",
        } as ApiError
      }
    />
  );
};
