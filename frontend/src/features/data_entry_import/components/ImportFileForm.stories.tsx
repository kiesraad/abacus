import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";
import { type FileErrorCase, fileError } from "../hooks/useDataEntryImport";
import { ImportFileForm } from "./ImportFileForm";

const fileErrorCases: Record<FileErrorCase, string> = {
  file_too_large: "Het bestand is te groot",
  invalid_510b: "Geen tellingsbestand EML 510b",
  invalid_zip: "Geen geldig ZIP-bestand",
  data_entry_already_imported: "Telresultaten GSB al geïmporteerd",
  data_entry_already_started: "GSB al ingevoerd",
  election_mismatch: "Tellingsbestand hoort niet bij dit CSB",
  contains_errors: "Tellingsbestand bevat fouten",
  unknown: "Importeren niet gelukt",
};

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
    await expect(canvas.getByText("Geen bestand gekozen")).toBeVisible();
    await expect(canvas.getByText("Bestand kiezen")).toBeVisible();
  },
};

export const WithErrors: Story = {
  render: (args) => (
    <>
      {(Object.keys(fileErrorCases) as FileErrorCase[]).map((name) => (
        <div key={name} id={name} className="mb-lg">
          <h2>{name}</h2>
          <ImportFileForm
            {...args}
            error={fileError(name, {
              electionName: "Gemeenteraad Juinen 2026",
              filename: "tellingsbestand_510b.zip",
              max_size: 12,
            })}
          />
          <hr />
        </div>
      ))}
    </>
  ),
  play: async ({ canvas }) => {
    for (const [name, title] of Object.entries(fileErrorCases)) {
      const alert = within(canvas.getByTestId(name)).getByRole("alert");
      await expect(alert).toHaveTextContent(title);
    }
  },
};
