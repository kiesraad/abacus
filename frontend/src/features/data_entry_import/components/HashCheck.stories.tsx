import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import type { RedactedEmlHash, SubCommitteeFirstSession } from "@/types/generated/openapi";
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

const subCommittee: SubCommitteeFirstSession = {
  committee_session_id: 801,
  id: 811,
  number: 35,
  name: "Juinen",
  authority_id: "0035",
  authority_name: "Juinen",
  data_entry_id: 801,
};

const meta = {
  component: HashCheck,
  args: {
    date: "2026-03-18",
    title: "Telresultaten GSB Gemeenteraad Juinen 2026",
    fileName: "telling.eml.xml.zip",
    subCommittee,
    hash: redactedHash,
    error: undefined,
    onSubmit: fn(),
  },
} satisfies Meta<typeof HashCheck>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Controleer tellingsbestand")).toBeVisible();
    await expect(canvas.getByText("telling.eml.xml.zip")).toBeVisible();
    await expect(canvas.getByText("Telresultaten GSB Gemeenteraad Juinen 2026")).toBeVisible();
    await expect(
      canvas.getByText(
        "Vul ter controle de afgeschermde delen van de digitale vingerafdruk in. De volledige code staat op het proces-verbaal Na 31-2 van het GSB van de gemeente Juinen.",
      ),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Volgende" })).toBeVisible();
  },
};

export const WithError: Story = {
  args: {
    error: "Invalid hash",
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "De ingevoerde vingerafdruk klopt niet. Controleer de vingerafdruk en probeer het opnieuw.",
    );
  },
};
