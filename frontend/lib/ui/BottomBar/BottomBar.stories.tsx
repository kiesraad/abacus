import type { Story } from "@ladle/react";

import { Button, KeyboardKeys } from "@kiesraad/ui";

import { BottomBar } from "./BottomBar";

export const BottomBarFooter: Story = () => {
  return (
    <BottomBar type="footer">
      <Button>Click me</Button>
    </BottomBar>
  );
};

export const BottomBarForm: Story = () => {
  return (
    <BottomBar type="form">
      <Button>Click me</Button>
      <KeyboardKeys keys={["shift", "enter"]} />
    </BottomBar>
  );
};

export const BottomBarInputGrid: Story = () => {
  return (
    <BottomBar type="input-grid">
      <Button>Click me</Button>
      <KeyboardKeys keys={["shift", "enter"]} />
    </BottomBar>
  );
};
