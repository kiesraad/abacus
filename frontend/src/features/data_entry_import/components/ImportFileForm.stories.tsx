import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, within } from "storybook/test";
import { CSBStatusResponseMock } from "@/testing/api-mocks/ElectionStatusMockData";
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
  signature_missing: "Digitale handtekening ontbreekt",
  signature_unknown: "Onbekende digitale handtekening",
  no_certificates: "Geen publieke sleutel om handtekening te controleren",
  unknown: "Importeren niet gelukt",
};

const meta = {
  component: ImportFileForm,
  args: {
    error: undefined,
    onFileChange: fn(),
    isLoading: false,
  },
  parameters: {
    needsElectionStatus: true,
    statuses: CSBStatusResponseMock.statuses,
  },
} satisfies Meta<typeof ImportFileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Geen bestand gekozen")).toBeVisible();
    await expect(canvas.getByText("Bestand kiezen")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Nog te importeren:" })).toBeVisible();
    const table = canvas.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table).toHaveTableContent([
      ["Nummer", "Gemeentelijk stembureau"],
      ["0001", "Juinen"],
      ["0002", "'s-Gravenveen"],
      ["0003", "Eksterlo"],
      ["0004", "Hovenerwoud"],
      ["0005", "Bloemstede"],
    ]);
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

export const Finished: Story = {
  parameters: {
    statuses: [],
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("Geen bestand gekozen")).not.toBeInTheDocument();
    await expect(canvas.queryByText("Bestand kiezen")).not.toBeInTheDocument();
    await expect(canvas.queryByRole("heading", { name: "Nog te importeren:" })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument();
    await expect(
      canvas.getByRole("heading", { name: "Alle gemeentelijk stembureaus zijn geïmporteerd" }),
    ).toBeVisible();
    const link = canvas.getByRole("link", { name: "Naar statusoverzicht steminvoer" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/status");
  },
};
