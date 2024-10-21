import type { Story } from "@ladle/react";

import { ProgressBar } from "@kiesraad/ui";

type Props = {
  title: string;
  percentage: number;
};

export const DefaultProgressBar: Story<Props> = ({ title, percentage }) => (
  <ProgressBar id="test" data={{ percentage: percentage, class: "default" }} title={title} />
);

export default {
  args: {
    title: "1e invoer",
    percentage: 47,
  },
};
