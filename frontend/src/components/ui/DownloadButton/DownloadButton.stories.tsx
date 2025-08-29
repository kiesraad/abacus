import type { Meta, StoryObj } from "@storybook/react-vite";

import { DownloadButton } from "./DownloadButton";

type Props = {
  label: string;
  icon: "file" | "download";
};

export const DefaultDownloadButton: StoryObj<Props> = {
  render: ({ label, icon }) => (
    <DownloadButton
      href="#"
      title="Download definitieve documenten eerste zitting"
      subtitle="Zip bestand, 225kb"
      icon={icon}
      aria-label={label}
    />
  ),
};

export const DisabledDownloadButton: StoryObj<Props> = {
  render: ({ label, icon }) => (
    <DownloadButton
      href="#"
      title="Bekijk een preview van het proces verbaal"
      icon={icon}
      aria-label={label}
      isDisabled
    />
  ),
};

export default {
  args: {
    label: "Invoer",
  },
  argTypes: {
    icon: {
      required: true,
      options: ["file", "download"],
      control: { type: "radio", defaultValue: "file" },
    },
  },
} satisfies Meta<Props>;
