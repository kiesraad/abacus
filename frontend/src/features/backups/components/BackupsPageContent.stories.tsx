import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { t } from "@/i18n/translate";

import { BackupsPageContent } from "./BackupsPageContent";

const meta = {
  component: BackupsPageContent,
  args: {
    isLoading: false,
    errorMessage: null,
    lastBackupAt: null,
    onCreateBackup: fn(),
  },
} satisfies Meta<typeof BackupsPageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Nu backup maken" })).toBeEnabled();
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("backup aan het maken")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Nu backup maken" })).toBeDisabled();
  },
};

export const BackupSuccess: Story = {
  args: {
    lastBackupAt: new Date(2026, 6, 7, 12, 34, 56),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Laatste backup gemaakt om 12:34")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Nu backup maken" })).toBeEnabled();
  },
};

export const BackupError: Story = {
  args: {
    errorMessage: t("error.api_error.BackupAlreadyExists"),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "De backup met deze naam bestaat al, probeer het later opnieuw",
    );
    await expect(canvas.getByRole("button", { name: "Nu backup maken" })).toBeEnabled();
  },
};
