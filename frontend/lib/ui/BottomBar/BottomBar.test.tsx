import { expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { BottomBarFooter, BottomBarForm, BottomBarInputGrid } from "./BottomBar.stories";

test("The footer bottom bar is rendered with a button as child", () => {
  render(<BottomBarFooter></BottomBarFooter>);

  const buttonElement = screen.getByRole("button", {
    name: "Click me",
  });

  buttonElement.click();
  expect(buttonElement).toBeEnabled();
});

test("The form bottom bar is rendered with a button and button hint as child", () => {
  render(<BottomBarForm></BottomBarForm>);

  const buttonElement = screen.getByRole("button", {
    name: "Click me",
  });
  const shiftElement = screen.getByText("Shift");
  const enterElement = screen.getByText("Enter");

  buttonElement.click();
  expect(buttonElement).toBeEnabled();

  expect(shiftElement).toBeVisible();
  expect(enterElement).toBeVisible();
});

test("The input grid bottom bar is rendered with a button and button hint as child", () => {
  render(<BottomBarInputGrid></BottomBarInputGrid>);

  const buttonElement = screen.getByRole("button", {
    name: "Click me",
  });
  const shiftElement = screen.getByText("Shift");
  const enterElement = screen.getByText("Enter");

  buttonElement.click();
  expect(buttonElement).toBeEnabled();

  expect(shiftElement).toBeVisible();
  expect(enterElement).toBeVisible();
});
