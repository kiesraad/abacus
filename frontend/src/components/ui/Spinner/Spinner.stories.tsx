import type { Story } from "@ladle/react";

import { Size } from "@kiesraad/ui";

import { Spinner } from "./Spinner";

type Props = {
  size: Size;
};

export const DefaultSpinner: Story<Props> = ({ size }) => {
  return <Spinner size={size} />;
};

export default {
  argTypes: {
    size: {
      options: ["sm", "md", "lg"],
      control: { type: "radio" },
    },
  },
};
