import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";

import { t } from "@/i18n/translate";

import { type FileErrorCase, fileError } from "../hooks/useDataEntryImport";

import { ImportFileForm } from "./ImportFileForm";

const fileErrorCases: FileErrorCase[] = [
  "invalid_510b",
  "invalid_zip",
  "data_entry_already_started",
  "election_mismatch",
  "contains_errors",
  "unknown",
];

const meta = {
  component: ImportFileForm,
  args: {
    error: undefined,
    onFileChange: fn(),
  },
} satisfies Meta<typeof ImportFileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(t("no_file_chosen"))).toBeVisible();
    await expect(canvas.getByText(t("select_file"))).toBeVisible();
  },
};

export const WithErrors: Story = {
  render: (args) => (
    <>
      {fileErrorCases.map((name) => (
        <div key={name} id={name} className="mb-lg">
          <h2>{name}</h2>
          <ImportFileForm {...args} error={fileError(name, { electionName: "Gemeenteraad Juinen 2026" })} />
          <hr />
        </div>
      ))}
    </>
  ),
  play: async ({ canvas }) => {
    for (const name of fileErrorCases) {
      const alert = within(canvas.getByTestId(name)).getByRole("alert");
      await expect(alert).toHaveTextContent(fileError(name).title);
    }
  },
};
