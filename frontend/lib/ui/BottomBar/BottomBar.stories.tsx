import type { Story } from "@ladle/react";

import { Button, KeyboardKey, KeyboardKeys } from "@kiesraad/ui";

import { BottomBar } from "./BottomBar";

export const BottomBarFooter: Story = () => {
  return (
    <BottomBar type="footer">
      <BottomBar.Row>
        <Button>Click me</Button>
      </BottomBar.Row>
    </BottomBar>
  );
};

export const BottomBarForm: Story = () => {
  return (
    <BottomBar type="form">
      <BottomBar.Row>
        <Button>Click me</Button>
        <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
      </BottomBar.Row>
    </BottomBar>
  );
};

export const BottomBarInputGrid: Story = () => {
  return (
    <BottomBar type="input-grid">
      <BottomBar.Row>
        <Button>Click me</Button>
        <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
      </BottomBar.Row>
    </BottomBar>
  );
};
