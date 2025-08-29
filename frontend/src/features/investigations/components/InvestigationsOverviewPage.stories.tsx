import type { Meta, StoryObj } from "@storybook/react-vite";

import { InvestigationsOverviewPage } from "./InvestigationsOverviewPage.tsx";

const meta = {
  component: InvestigationsOverviewPage,
  parameters: {
    needsElection: true,
  },
} satisfies Meta<typeof InvestigationsOverviewPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
