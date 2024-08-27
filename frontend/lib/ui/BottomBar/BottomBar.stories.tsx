import type { Story } from "@ladle/react";

import { Button, Enter, Shift } from "@kiesraad/ui";

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
      <span className="button_hint">
        <Shift />
        <Enter />
      </span>
    </BottomBar>
  );
};

export const BottomBarInputGrid: Story = () => {
  return (
    <BottomBar type="input-grid">
      <Button>Click me</Button>
      <span className="button_hint">
        <Shift />
        <Enter />
      </span>
    </BottomBar>
  );
};
