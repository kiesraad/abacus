import type { Meta, StoryObj } from "@storybook/react-vite";

import { MessageSubsectionComponent } from "./MessageSubsection";

const meta = {
  component: MessageSubsectionComponent,
} satisfies Meta<typeof MessageSubsectionComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Message: Story = {
  args: {
    subsection: {
      type: "message",
      message: "data_entry.continue_after_check",
    },
  },
};
