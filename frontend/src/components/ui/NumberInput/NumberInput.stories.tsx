import type { Story } from "@ladle/react";

import { NumberInput } from "@kiesraad/ui";

export const DefaultNumberInput: Story = () => {
  return <NumberInput id="test" defaultValue={12300} />;
};
