import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { t } from "@/i18n/translate";
import type { RedactedEmlHash } from "@/types/generated/openapi";

import { HashCheck } from "./HashCheck";

const redactedHash: RedactedEmlHash = {
  chunks: [
    "a1b2",
    "c3d4",
    "",
    "e5f6",
    "7890",
    "1234",
    "5678",
    "9abc",
    "def0",
    "",
    "1357",
    "2468",
    "0f1e",
    "2d3c",
    "4b5a",
    "6978",
  ],
  redacted_indexes: [2, 9],
};

const meta = {
  component: HashCheck,
  args: {
    date: "2026-03-18",
    title: "Gemeenteraad Juinen 2026",
    fileName: "telling.eml.xml.zip",
    fileAuthorityName: "Juinen",
    hash: redactedHash,
    error: undefined,
    onSubmit: fn(),
  },
} satisfies Meta<typeof HashCheck>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(t("data_entry_import.hash_check.title"))).toBeVisible();
    await expect(canvas.getByText("telling.eml.xml.zip")).toBeVisible();
    await expect(canvas.getByText("Gemeenteraad Juinen 2026")).toBeVisible();
    await expect(
      canvas.getByText(t("data_entry_import.hash_check.instructions", { fileAuthorityName: "Juinen" })),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: t("next") })).toBeVisible();
  },
};

export const WithError: Story = {
  args: {
    error: "Invalid hash",
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      t("data_entry_import.hash_check.error.description"),
    );
  },
};
