import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { InvestigationReason } from "./InvestigationReason";

const meta = {
  component: InvestigationReason,
  parameters: {
    needsElection: true,
    needsMessages: true,
  },
} satisfies Meta<typeof InvestigationReason>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pollingStationId: 1,
  },
  play: async ({ canvas }) => {
    const heading = await canvas.findByRole("heading", {
      level: 2,
      name: "Aanleiding en opdracht van het centraal stembureau",
    });
    await expect(heading).toBeVisible();
  },
};
