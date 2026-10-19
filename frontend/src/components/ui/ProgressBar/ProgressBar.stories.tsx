import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { type PercentageAndColorClass, ProgressBar, type ProgressBarProps } from "./ProgressBar";

export const DefaultProgressBar: StoryObj<ProgressBarProps> = {
  render: ({ id, title, data, spacing, showPercentage }) => (
    <ProgressBar id={id} data={data} title={title} spacing={spacing} showPercentage={showPercentage} />
  ),
  args: {
    id: "test",
    data: { percentage: 47, class: "default" },
    showPercentage: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Voortgang")).toBeVisible();
    await expect(canvas.getByRole("complementary")).toHaveTextContent("47%");

    const innerBars = canvas.getByRole("progressbar").children;
    await expect(innerBars.length).toEqual(1);
    for (const bar of innerBars) {
      await expect(bar.getAttribute("style")).toEqual("width: 47%;");
      await expect(bar.classList.contains("default")).toBeTruthy();
    }
  },
};

export const DefaultProgressBarOver100Percent: StoryObj<ProgressBarProps> = {
  render: ({ id, title, data, spacing, showPercentage }) => (
    <ProgressBar id={id} data={data} title={title} spacing={spacing} showPercentage={showPercentage} />
  ),
  args: {
    id: "test",
    data: { percentage: 255, class: "default" },
    showPercentage: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Voortgang")).toBeVisible();
    await expect(canvas.getByRole("complementary")).toHaveTextContent("100%");

    const innerBars = canvas.getByRole("progressbar").children;
    await expect(innerBars.length).toEqual(1);
    for (const bar of innerBars) {
      await expect(bar.getAttribute("style")).toEqual("width: 100%;");
      await expect(bar.classList.contains("default")).toBeTruthy();
    }
  },
};

const data: PercentageAndColorClass[] = [
  { percentage: 5, class: "errors-and-warnings" },
  { percentage: 35, class: "in-progress" },
  { percentage: 30, class: "first-entry-finished" },
  { percentage: 25, class: "definitive" },
  { percentage: 2, class: "not-started" },
];

export const MultiProgressBar: StoryObj<ProgressBarProps> = {
  render: ({ id, data, spacing }) => <ProgressBar id={id} data={data} spacing={spacing} />,
  args: {
    id: "test",
    data,
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByTestId("progressbar-label")).not.toBeInTheDocument();
    await expect(canvas.queryByRole("complementary")).not.toBeInTheDocument();

    const bars = [...canvas.getByTestId("multi-outer-bar").children];
    for (const bar of bars) {
      const index = bars.indexOf(bar);
      await expect(bar.getAttribute("style")).toEqual(`width: ${data[index]?.percentage}%;`);
      await expect(bar.classList.contains(`${data[index]?.class}`)).toBeTruthy();
    }
  },
};

export default {
  args: {
    title: "Voortgang",
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
