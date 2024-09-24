import type { Story } from "@ladle/react";

import { ProgressBar } from "./ProgressBar";

type Props = {
  title: string;
  percent: number;
};

export const DefaultProgressBar: Story<Props> = ({ title, percent }) => (
  <ProgressBar title={title} percent={percent} id="test" />
);

export default {
  args: {
    title: "1e invoer",
    percent: 47,
  },
};
