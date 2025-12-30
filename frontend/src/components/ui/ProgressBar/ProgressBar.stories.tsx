import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProgressBar, type ProgressBarProps } from "./ProgressBar";

export const DefaultProgressBar: StoryObj<ProgressBarProps> = {
  render: ({ id = "test", title, data = { percentage: 47, class: "default" }, spacing, showPercentage = true }) => (
    <ProgressBar id={id} data={data} title={title} spacing={spacing} showPercentage={showPercentage} />
  ),
};

export const MultiProgressBar: StoryObj<ProgressBarProps> = {
  render: ({
    id = "test",
    title,
    data = [
      { percentage: 5, class: "errors-and-warnings" },
      { percentage: 35, class: "in-progress" },
      { percentage: 30, class: "first-entry-finished" },
      { percentage: 25, class: "definitive" },
      { percentage: 2, class: "not-started" },
    ],
    spacing,
  }) => <ProgressBar id={id} data={data} title={title} spacing={spacing} />,
};

export default {
  args: {
    title: "1e invoer",
    spacing: "small",
    showPercentage: true,
  },
  argTypes: {
    title: {
      control: { type: "text" },
    },
    spacing: {
      options: ["small", "large"],
      control: { type: "select" },
    },
    showPercentage: {
      options: [true, false],
      control: { type: "boolean" },
    },
  },
} satisfies Meta<ProgressBarProps>;
