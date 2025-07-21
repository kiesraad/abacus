import type { Meta, StoryObj } from "@storybook/react-vite";

import { HeadingSubsectionComponent } from "./HeadingSubsection";

const meta = {
  component: HeadingSubsectionComponent,
} satisfies Meta<typeof HeadingSubsectionComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Heading: Story = {
  args: {
    subsection: {
      type: "heading",
      title: "voters_votes_counts.form_title",
    },
  },
};
