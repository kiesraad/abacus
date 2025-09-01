import type { Meta, StoryObj } from "@storybook/react-vite";

import { AddInvestigationPage } from "./AddInvestigationPage";

const meta = {
  component: AddInvestigationPage,
  parameters: {
    needsElection: true,
  },
} satisfies Meta<typeof AddInvestigationPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
