import type { Story } from "@ladle/react";

import { NumberInput } from "../NumberInput/NumberInput";

export const DefaultNumberInput: Story = () => {
  return <NumberInput id="test" defaultValue={12300} />;
};
