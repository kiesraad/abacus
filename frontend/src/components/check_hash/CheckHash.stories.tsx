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
      "Vul ter controle de afgeschermde delen van de digitale vingerafdruk in. De volledige code heb je van het centraal stembureau ontvangen.",
    errorTitle: "Controle digitale vingerafdruk niet gelukt",
    errorDescription:
      "Controleer of de ingevulde controle-delen overeenkomen met de digitale vingerafdruk die je hebt ontvangen.",
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
        "Vul ter controle de afgeschermde delen van de digitale vingerafdruk in. De volledige code heb je van het centraal stembureau ontvangen.",
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
      "Controleer of de ingevulde controle-delen overeenkomen met de digitale vingerafdruk die je hebt ontvangen.",
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
      "Controleer of de ingevulde controle-delen overeenkomen met de digitale vingerafdruk die je hebt ontvangen.",
    );
  },
};
