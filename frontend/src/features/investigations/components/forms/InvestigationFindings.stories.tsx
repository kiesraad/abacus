import type { Meta, StoryObj } from "@storybook/react-vite";

import { InvestigationFindings } from "./InvestigationFindings";

const meta = {
  component: InvestigationFindings,
  parameters: {
    needsElection: true,
    needsMessages: true,
  },
} satisfies Meta<typeof InvestigationFindings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pollingStationId: 1,
  },
};
