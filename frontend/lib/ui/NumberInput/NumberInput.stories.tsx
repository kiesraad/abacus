import type { Story } from "@ladle/react";

import { NumberInput } from "./NumberInput";

export const DefaultNumberInput: Story = () => {
  return <NumberInput id="test" defaultValue={1200} />;
};
