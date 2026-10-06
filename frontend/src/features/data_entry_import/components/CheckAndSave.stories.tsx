import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import { t } from "@/i18n/translate";
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
    await expect(await canvas.findByText(t("data_entry_import.check_and_save.title"))).toBeVisible();
    await expect(canvas.getByText("Gemeenteraad Juinen 2026")).toBeVisible();
    await expect(canvas.getByText(t("committee_category.GSB.short"))).toBeVisible();
    await expect(canvas.getByText(/Juinen \(0035\)/)).toBeVisible();
    await expect(canvas.getByRole("button", { name: t("save") })).toBeVisible();
  },
};
