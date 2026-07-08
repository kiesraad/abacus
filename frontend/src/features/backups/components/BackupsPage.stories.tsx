import type { StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { ApiProviderContext, type ApiState } from "@/api/ApiProviderContext";
import { ApiError, ApiResponseStatus, type ApiResult } from "@/api/ApiResult";
import type { BackupResponse } from "@/types/generated/openapi";

import { BackupsPage } from "./BackupsPage";

const successBackupResponse = {
  status: ApiResponseStatus.Success,
  code: 201,
  data: {
    created_at: new Date(2026, 6, 7, 12, 34, 56).toISOString(),
    filename: "db_backup_2026-07-07_12-34-56.sqlite",
  },
} satisfies ApiResult<BackupResponse>;
const successPostRequest: ApiState["client"]["postRequest"] = <T,>() =>
  Promise.resolve(successBackupResponse as ApiResult<T>);

const errorPostRequest: ApiState["client"]["postRequest"] = () =>
  Promise.resolve(new ApiError(ApiResponseStatus.ClientError, 409, "Backup already exists", "BackupAlreadyExists"));

function renderWithPostRequest(postRequest: ApiState["client"]["postRequest"]) {
  return (
    <ApiProviderContext.Provider value={{ client: { postRequest } } as ApiState}>
      <BackupsPage />
    </ApiProviderContext.Provider>
  );
}

export const Default: StoryObj = {
  render: () => renderWithPostRequest(successPostRequest),
};

export const BackupSuccess: StoryObj = {
  render: () => renderWithPostRequest(successPostRequest),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Nu backup maken" }));

    await expect(await canvas.findByText("Laatste backup gemaakt om 12:34")).toBeVisible();
  },
};

export const BackupError: StoryObj = {
  render: () => renderWithPostRequest(errorPostRequest),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Nu backup maken" }));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "De backup met deze naam bestaat al, probeer het later opnieuw",
    );
  },
};

export default {};
