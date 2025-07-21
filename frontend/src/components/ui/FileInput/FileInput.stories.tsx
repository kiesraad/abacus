import type { Meta, StoryFn } from "@storybook/react-vite";

import { FileInput } from "./FileInput";

export const DefaultFileInput: StoryFn = () => {
  return <FileInput id="test">Bestand kiezen</FileInput>;
};

export default {} satisfies Meta;
