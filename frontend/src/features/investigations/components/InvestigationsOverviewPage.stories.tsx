import type { Meta, StoryObj } from "@storybook/react-vite";

import { InvestigationsOverviewPage } from "./InvestigationsOverviewPage";

const meta = {
  component: InvestigationsOverviewPage,
  parameters: {
    needsElection: true,
    needsElectionStatus: true,
    committeeSessionNumber: 2,
    needsMessages: true,
  },
} satisfies Meta<typeof InvestigationsOverviewPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
