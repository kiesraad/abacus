import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import {
  ErrorTextAreaInputField,
  DefaultLargeNarrowInputField,
  DefaultLargeWideInputField,
  DefaultMediumNarrowInputField,
  DefaultMediumWideInputField,
  DefaultSmallNarrowInputField,
  DefaultSmallWideInputField,
  DefaultTextAreaInputField,
  ErrorLargeWideInputField,
  ErrorLargeNarrowInputField,
} from "./InputField.stories.tsx";

test("The default small wide input field is rendered", () => {
  render(<DefaultSmallWideInputField />);

  const inputElement = screen.getByRole("textbox");

  inputElement.click();
  expect(inputElement).toBeEnabled();
});

test("The default medium wide input field is rendered", () => {
  render(<DefaultMediumWideInputField />);

  const inputElement = screen.getByRole("textbox");

  inputElement.click();
  expect(inputElement).toBeEnabled();
});

test("The default large wide input field is rendered", () => {
  render(<DefaultLargeWideInputField />);

  const inputElement = screen.getByRole("textbox");

  inputElement.click();
  expect(inputElement).toBeEnabled();
});

test("The error large wide input field is rendered", () => {
  render(<ErrorLargeWideInputField />);

  const inputElement = screen.getByRole("textbox");
  const errorElement = screen.getByText("There is an error");

  inputElement.click();
  expect(inputElement).toBeEnabled();
  expect(errorElement).toBeInTheDocument();
});

test("The default small narrow input field is rendered", () => {
  render(<DefaultSmallNarrowInputField />);

  const inputElement = screen.getByRole("textbox");

  inputElement.click();
  expect(inputElement).toBeEnabled();
});

test("The default medium narrow input field is rendered", () => {
  render(<DefaultMediumNarrowInputField />);

  const inputElement = screen.getByRole("textbox");

  inputElement.click();
  expect(inputElement).toBeEnabled();
});

test("The default large narrow input field is rendered", () => {
  render(<DefaultLargeNarrowInputField />);

  const inputElement = screen.getByRole("textbox");

  inputElement.click();
  expect(inputElement).toBeEnabled();
});

test("The error large narrow input field is rendered", () => {
  render(<ErrorLargeNarrowInputField />);

  const inputElement = screen.getByRole("textbox");
  const errorElement = screen.getByText("There is an error");

  inputElement.click();
  expect(inputElement).toBeEnabled();
  expect(errorElement).toBeInTheDocument();
});

test("The default text area input field is rendered", () => {
  render(<DefaultTextAreaInputField />);

  const inputElement = screen.getByRole("textbox");

  inputElement.click();
  expect(inputElement).toBeEnabled();
});

test("The error text area input field is rendered", () => {
  render(<ErrorTextAreaInputField />);

  const inputElement = screen.getByRole("textbox");
  const errorElement = screen.getByText("There is an error");

  inputElement.click();
  expect(inputElement).toBeEnabled();
  expect(errorElement).toBeInTheDocument();
});
