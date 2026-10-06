import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import type { SubCommitteeFirstSession } from "@/types/generated/openapi";
import { CheckAndSave } from "./CheckAndSave";

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
  component: CheckAndSave,
  args: {
    electionName: "Gemeenteraad Juinen 2026",
    subCommittee,
    onSubmit: fn(),
  },
} satisfies Meta<typeof CheckAndSave>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Je gaat de volgende telresultaten importeren:")).toBeVisible();
    await expect(canvas.getByText("Gemeenteraad Juinen 2026")).toBeVisible();
    await expect(canvas.getByText("Gemeentelijk stembureau")).toBeVisible();
    await expect(canvas.getByText(/Juinen \(0035\)/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Opslaan" })).toBeVisible();
  },
};
