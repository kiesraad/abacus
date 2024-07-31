import { expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { DefaultBottomBar } from "./BottomBar.stories";

test("The bottom bar is rendered with a button as child", () => {
  render(<DefaultBottomBar></DefaultBottomBar>);

  const buttonElement = screen.getByRole("button", {
    name: "Click me",
  });

  buttonElement.click();
  expect(buttonElement).toBeEnabled();
});
