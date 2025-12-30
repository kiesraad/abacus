import type { Meta, StoryObj } from "@storybook/react-vite";

import type { Size } from "@/types/ui";

import { Spinner } from "./Spinner";

type Props = {
  size: Size;
};

export const DefaultSpinner: StoryObj<Props> = {
  render: ({ size }) => {
    return <Spinner size={size} />;
  },
};

export default {
  argTypes: {
    size: {
      options: ["sm", "md", "lg"],
      control: { type: "radio" },
    },
  },
} satisfies Meta<Props>;
