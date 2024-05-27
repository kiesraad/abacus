import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { NarrowInputField, TextAreaInputField, WideInputField } from "./InputField.stories.tsx";

test("The wide input fields are rendered", () => {
  render(<WideInputField />);

  const smallElement = screen.getByRole("textbox", { name: "Default Small Wide with subtext" });

  smallElement.click();
  expect(smallElement).toBeEnabled();

  const mediumElement = screen.getByRole("textbox", { name: "Default Medium Wide" });

  mediumElement.click();
  expect(mediumElement).toBeEnabled();

  const largeElement = screen.getByRole("textbox", { name: "Default Large Wide" });

  largeElement.click();
  expect(largeElement).toBeEnabled();

  const errorElement = screen.getByRole("textbox", { name: "Error Large Wide" });

  errorElement.click();
  expect(errorElement).toBeEnabled();
  expect(errorElement).toHaveAccessibleErrorMessage("There is an error");
});

test("The narrow input fields are rendered", () => {
  render(<NarrowInputField />);

  const smallElement = screen.getByRole("textbox", { name: "Default Small Narrow" });

  smallElement.click();
  expect(smallElement).toBeEnabled();

  const mediumElement = screen.getByRole("textbox", { name: "Default Medium Narrow with subtext" });

  mediumElement.click();
  expect(mediumElement).toBeEnabled();

  const largeElement = screen.getByRole("textbox", { name: "Default Large Narrow" });

  largeElement.click();
  expect(largeElement).toBeEnabled();

  const errorElement = screen.getByRole("textbox", { name: "Error Large Narrow" });

  errorElement.click();
  expect(errorElement).toBeEnabled();
  expect(errorElement).toHaveAccessibleErrorMessage("There is an error");
});

test("The text area input fields are rendered", () => {
  render(<TextAreaInputField />);

  const defaultElement = screen.getByRole("textbox", { name: "Default Text Area with subtext" });

  defaultElement.click();
  expect(defaultElement).toBeEnabled();

  const errorElement = screen.getByRole("textbox", { name: "Error Text Area" });

  errorElement.click();
  expect(errorElement).toBeEnabled();
  expect(errorElement).toHaveAccessibleErrorMessage("There is an error");
});
