import type { Meta, StoryFn } from "@storybook/react-vite";

import { LinkButton } from "./LinkButton";

export const DefaultLinkButton: StoryFn = () => {
  return <LinkButton id="test" text="Click here" />;
};

export default {} satisfies Meta;
