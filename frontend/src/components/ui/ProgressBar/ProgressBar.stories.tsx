import type { Story } from "@ladle/react";

import { ProgressBar, ProgressBarProps } from "./ProgressBar";

export const DefaultProgressBar: Story<ProgressBarProps> = ({
  id = "test",
  title,
  data = { percentage: 47, class: "default" },
  spacing,
  showPercentage = true,
}) => <ProgressBar id={id} data={data} title={title} spacing={spacing} showPercentage={showPercentage} />;

DefaultProgressBar.argTypes = {
  title: {
    control: { type: "text" },
    defaultValue: "1e invoer",
  },
  spacing: {
    options: ["small", "large"],
    control: { type: "select" },
    defaultValue: "small",
  },
  showPercentage: {
    options: [true, false],
    control: { type: "boolean" },
    defaultValue: true,
  },
};

export const MultiProgressBar: Story<ProgressBarProps> = ({
  id = "test",
  title,
  data = [
    { percentage: 5, class: "errors-and-warnings" },
    { percentage: 3, class: "unfinished" },
    { percentage: 35, class: "in-progress" },
    { percentage: 30, class: "first-entry-finished" },
    { percentage: 25, class: "definitive" },
    { percentage: 2, class: "not-started" },
  ],
  spacing,
}) => <ProgressBar id={id} data={data} title={title} spacing={spacing} />;

MultiProgressBar.argTypes = {
  title: {
    control: { type: "text" },
    defaultValue: "1e invoer",
  },
  spacing: {
    options: ["small", "large"],
    control: { type: "select" },
    defaultValue: "small",
  },
};
