import type { Story } from "@ladle/react";

import { ProgressBar } from "./ProgressBar";

type Props = {
  title: string;
};

export const DefaultProgressBar: Story<Props> = ({ title }) => <ProgressBar title={title} percent={48} />;

export default {
  args: {
    title: "1e invoer",
  },
};
