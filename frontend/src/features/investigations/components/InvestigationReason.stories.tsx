import type { Meta, StoryObj } from "@storybook/react-vite";

import { InvestigationReason } from "./InvestigationReason";

const meta = {
  component: InvestigationReason,
} satisfies Meta<typeof InvestigationReason>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
