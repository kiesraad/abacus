import type { Meta, StoryObj } from "@storybook/react-vite";

import { DownloadButton } from "./DownloadButton";

const meta = {
  component: DownloadButton,
  globals: {
    backgrounds: { value: "light" },
  },
} satisfies Meta<typeof DownloadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: "download",
    href: "#",
    title: "Download definitieve documenten eerste zitting",
    subtitle: "Zip bestand, 225kb",
  },
};

export const Disabled: Story = {
  args: {
    icon: "file",
    href: "#",
    title: "Bekijk een preview van het proces verbaal",
    isDisabled: true,
  },
};
