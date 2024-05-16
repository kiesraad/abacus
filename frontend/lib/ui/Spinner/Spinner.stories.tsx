import type { Story } from "@ladle/react";

import { Spinner } from "./Spinner";

export const SpinnerSizes: Story = () => {
  return (
    <>
      <div>
        <Spinner size="sm" />
      </div>
      <div>
        <Spinner size="md" />
      </div>
      <div>
        <Spinner size="lg" />
      </div>
    </>
  );
};
