import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

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
      message: "This is a message",
    },
  },
};

export const Notify: Story = {
  args: {
    subsection: {
      type: "message",
      variant: "notify",
      title: "Neem de vinkjes over zoals ze op het papieren formulier zijn gezet.",
      message: "Zijn er ook getallen gecorrigeerd? Neem die over in de kolom ‘gecorrigeerd’",
    },
  },
  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent("Neem de vinkjes over zoals ze op het papieren formulier zijn gezet.");
    await expect(alert).toHaveTextContent(
      "Zijn er ook getallen gecorrigeerd? Neem die over in de kolom ‘gecorrigeerd’",
    );
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument();
  },
};
