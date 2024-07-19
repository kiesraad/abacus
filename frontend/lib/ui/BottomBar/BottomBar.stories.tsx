import type { Story } from "@ladle/react";

import { Button } from "@kiesraad/ui";

import { BottomBar } from "./BottomBar";

export const DefaultBottomBar: Story = () => {
  return (
    <BottomBar type="footer">
      <Button>Click me</Button>
    </BottomBar>
  );
};
