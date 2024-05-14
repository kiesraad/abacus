import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import {
  DefaultLargeInputField,
  DefaultSmallInputField,
  DefaultTextAreaInputField,
} from "./InputField.stories.tsx";

test("The default large input field is rendered", () => {
  render(<DefaultLargeInputField />);

  const inputElement = screen.getByRole("textbox");

  inputElement.click();
  expect(inputElement).toBeEnabled();
});

test("The default small input field is rendered", () => {
  render(<DefaultSmallInputField />);

  const inputElement = screen.getByRole("textbox");

  inputElement.click();
  expect(inputElement).toBeEnabled();
});

test("The default text area input field is rendered", () => {
  render(<DefaultTextAreaInputField />);

  const inputElement = screen.getByRole("textbox");

  inputElement.click();
  expect(inputElement).toBeEnabled();
});
