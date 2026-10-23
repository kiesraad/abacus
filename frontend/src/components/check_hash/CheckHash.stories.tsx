import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import type { RedactedEmlHash } from "@/types/generated/openapi";
import { CheckHash } from "./CheckHash";

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
  component: CheckHash,
  args: {
    date: "2026-03-18",
    instructions:
      "Controleer de volledige digitale vingerafdruk met de code die je van het centraal stembureau hebt ontvangen. Vul ter controle de twee afgeschermde delen hieronder in. Ga alleen verder als alle delen overeenkomen.",
    errorTitle: "Onjuiste vingerafdruk",
    errorDescription: "De ingevoerde vingerafdruk klopt niet. Controleer de vingerafdruk en probeer het opnieuw.",
    redactedHash,
    error: undefined,
    onSubmit: fn(),
  },
} satisfies Meta<typeof CheckHash>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Election: Story = {
  args: {
    header: "Controleer verkiezingsdefinitie",
    description: (
      <>
        Het bestand <strong>verkiezingsdefinitie_PS27.eml.xml</strong> bevat de instellingen voor de volgende
        verkiezing:
      </>
    ),
    title: "Gemeenteraad Juinen 2026",
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Controleer verkiezingsdefinitie")).toBeVisible();
    await expect(canvas.getByText("verkiezingsdefinitie_PS27.eml.xml")).toBeVisible();
    await expect(canvas.getByText("Gemeenteraad Juinen 2026")).toBeVisible();
    await expect(
      canvas.getByText(
        "Controleer de volledige digitale vingerafdruk met de code die je van het centraal stembureau hebt ontvangen. Vul ter controle de twee afgeschermde delen hieronder in. Ga alleen verder als alle delen overeenkomen.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Volgende" })).toBeVisible();
  },
};

export const ElectionWithError: Story = {
  args: {
    header: "Controleer verkiezingsdefinitie",
    description: (
      <>
        Het bestand <strong>verkiezingsdefinitie_PS27.eml.xml</strong> bevat de instellingen voor de volgende
        verkiezing:
      </>
    ),
    title: "Gemeenteraad Juinen 2026",
    error: "Invalid hash",
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "De ingevoerde vingerafdruk klopt niet. Controleer de vingerafdruk en probeer het opnieuw.",
    );
  },
};

export const Candidates: Story = {
  args: {
    header: "Controleer kandidatenlijsten",
    description: (
      <>
        Het bestand <strong>kandidatenlijst_Fryslân_PS27.eml.xml</strong> bevat de volgende kandidaten:
      </>
    ),
    title: "Fryslân, kandidatenlijsten PS2027",
  },
};

export const CandidatesWithError: Story = {
  args: {
    header: "Controleer kandidatenlijsten",
    description: (
      <>
        Het bestand <strong>kandidatenlijst_Fryslân_PS27.eml.xml</strong> bevat de volgende kandidaten:
      </>
    ),
    title: "Fryslân, kandidatenlijsten PS2027",
    error: "Invalid hash",
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "De ingevoerde vingerafdruk klopt niet. Controleer de vingerafdruk en probeer het opnieuw.",
    );
  },
};
