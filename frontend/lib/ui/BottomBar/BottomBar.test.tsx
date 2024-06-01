import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { DefaultBottomBar } from "./BottomBar.stories.tsx";

test("The bottom bar is rendered with a button as child", () => {
  render(<DefaultBottomBar></DefaultBottomBar>);

  const buttonElement = screen.getByRole("button", {
    name: "Click me",
  });

  buttonElement.click();
  expect(buttonElement).toBeEnabled();
});
