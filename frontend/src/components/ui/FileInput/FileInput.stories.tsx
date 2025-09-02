import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { FileInput } from "./FileInput";

export const DefaultFileInput: StoryObj = {
  render: () => <FileInput id="test">Bestand kiezen</FileInput>,
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Bestand kiezen")).toBeInTheDocument();
    await expect(canvas.getByLabelText("Geen bestand gekozen")).toBeInTheDocument();
  },
};

export default {} satisfies Meta;
