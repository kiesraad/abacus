import type { Meta, StoryObj } from "@storybook/react-vite";

import { DownloadButton } from "./DownloadButton";

const meta = {
  component: DownloadButton,
  globals: {
    backgrounds: { value: "blue" },
  },
} satisfies Meta<typeof DownloadButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: "download",
    href: "#",
    title: "Download definitieve documenten eerste zitting",
    subtitle: "ZIP-bestand, 225kb",
  },
};

export const WithContent: Story = {
  args: {
    children: (
      <>
        Organisatie: AB2027_Juinduinen
        <br />
        Organisatorische eenheid: Abacus 1.2
        <br />
        Algemene naam: Gemeente Juinen
        <br />
        Geldig vanaf: 10 maart 2027
        <br />
        Geldig tot en met: 9 september 2027
        <br />
        Handtekeningalgoritme: SHA256withRSA
      </>
    ),
    icon: "download",
    href: "#",
    title: "Publieke sleutel HSB Juinen AB2027_Juinduinen",
    subtitle: "Download crt-bestand",
  },
};

export const Disabled: Story = {
  args: {
    icon: "file",
    href: "#",
    title: "Bekijk een preview van het proces-verbaal",
    isDisabled: true,
  },
};
