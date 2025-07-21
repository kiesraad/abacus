import type { Meta, StoryFn, StoryObj } from "@storybook/react-vite";
import { action } from "storybook/actions";
import { expect } from "storybook/test";

import { KeyboardKey } from "@/types/ui";

import { Button } from "../Button/Button";
import { KeyboardKeys } from "../KeyboardKeys/KeyboardKeys";
import { BottomBar } from "./BottomBar";

export const BottomBarFooter: StoryFn = () => {
  return (
    <BottomBar type="footer">
      <BottomBar.Row>
        <Button size="lg" onClick={action("on-click")}>
          Click me
        </Button>
      </BottomBar.Row>
    </BottomBar>
  );
};

export const BottomBarForm: StoryObj = {
  render: () => {
    return (
      <BottomBar type="form">
        <BottomBar.Row>
          <Button size="lg" onClick={action("on-click")}>
            Click me
          </Button>
          <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
        </BottomBar.Row>
      </BottomBar>
    );
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Click me" });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    const shiftElement = canvas.getByText("Shift");
    const enterElement = canvas.getByText("Enter");

    await expect(shiftElement).toBeVisible();
    await expect(enterElement).toBeVisible();
  },
};

export const BottomBarInputGrid: StoryFn = () => {
  return (
    <BottomBar type="inputGrid">
      <BottomBar.Row>
        <Button size="lg" onClick={action("on-click")}>
          Click me
        </Button>
        <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
      </BottomBar.Row>
    </BottomBar>
  );
};

export default {} satisfies Meta;
