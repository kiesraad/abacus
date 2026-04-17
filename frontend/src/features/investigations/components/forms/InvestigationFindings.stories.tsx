import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { InvestigationFindings } from "./InvestigationFindings";

const meta = {
  component: InvestigationFindings,
  parameters: {
    needsElection: true,
    needsMessages: true,
    committeeSessionNumber: 2,
  },
} satisfies Meta<typeof InvestigationFindings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pollingStationId: 1,
  },
  play: async ({ canvas }) => {
    const heading = await canvas.findByRole("heading", {
      level: 2,
      name: "Bevindingen van het onderzoek door het gemeentelijk stembureau",
    });
    await expect(heading).toBeVisible();
  },
};
