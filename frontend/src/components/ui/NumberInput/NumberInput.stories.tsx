import type { Story } from "@ladle/react";

import { NumberInput } from "@/components/ui";

export const DefaultNumberInput: Story = () => {
  return <NumberInput id="test" defaultValue={12300} />;
};
