import type { Story } from "@ladle/react";

import { KeyboardKey } from "@/types/ui";

import { Button } from "../Button/Button";
import { KeyboardKeys } from "../KeyboardKeys/KeyboardKeys";
import { BottomBar } from "./BottomBar";

export const BottomBarFooter: Story = () => {
  return (
    <BottomBar type="footer">
      <BottomBar.Row>
        <Button size="lg">Click me</Button>
      </BottomBar.Row>
    </BottomBar>
  );
};

export const BottomBarForm: Story = () => {
  return (
    <BottomBar type="form">
      <BottomBar.Row>
        <Button size="lg">Click me</Button>
        <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
      </BottomBar.Row>
    </BottomBar>
  );
};

export const BottomBarInputGrid: Story = () => {
  return (
    <BottomBar type="inputGrid">
      <BottomBar.Row>
        <Button size="lg">Click me</Button>
        <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
      </BottomBar.Row>
    </BottomBar>
  );
};
