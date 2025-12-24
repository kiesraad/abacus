import type { Meta, StoryObj } from "@storybook/react-vite";

import { ApiError, ApiResponseStatus, NetworkError } from "@/api/ApiResult";
import { ErrorModal } from "@/components/error/ErrorModal";

const meta = { component: ErrorModal } satisfies Meta<typeof ErrorModal>;
export default meta;

type Story = StoryObj<typeof meta>;

export const ServerErrorModal = {
  args: {
    error: new ApiError(ApiResponseStatus.ServerError, 500, "Internal Server Error", "InternalServerError"),
  },
} satisfies Story;

export const NetworkErrorModal = {
  args: {
    error: new NetworkError("Network errors are the worst"),
  },
} satisfies Story;

export const UnknownServerErrorModal = {
  args: {
    // we need to disable the linter to test the method with an unknown translation key
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    error: new ApiError(ApiResponseStatus.ServerError, 543, "Unknown Server Error", "UnknownServerError"),
  },
} satisfies Story;
