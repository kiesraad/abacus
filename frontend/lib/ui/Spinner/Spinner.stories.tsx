import type { Story } from "@ladle/react";

import { Spinner } from "./Spinner";
import { Size } from "../ui.types";

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
