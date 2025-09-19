import type { Meta, StoryObj } from "@storybook/react-vite";

import { InvestigationPrintCorrigendum } from "./InvestigationPrintCorrigendum";

const meta = {
  component: InvestigationPrintCorrigendum,
  parameters: {
    needsElection: true,
    needsMessages: true,
  },
} satisfies Meta<typeof InvestigationPrintCorrigendum>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    pollingStationId: 1,
  },
};
