import { Story } from "@ladle/react";

import { ErrorModal } from "@/components/error/ErrorModal";

import { ApiError, ApiResponseStatus } from "@kiesraad/api";

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
