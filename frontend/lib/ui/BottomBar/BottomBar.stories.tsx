import type { Story } from "@ladle/react";

import { BottomBar } from "./BottomBar";
import { Button } from "@kiesraad/ui";

export const DefaultBottomBar: Story = () => {
  return (
    <BottomBar type="full">
      <Button>Click me</Button>
    </BottomBar>
  );
};
