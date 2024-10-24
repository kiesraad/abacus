import { expect } from "vitest";

import { screen, within } from "app/test/unit";

export function expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(fields: Array<string>, feedbackMessage: string) {
  fields.forEach((field) => {
    const inputField = within(screen.getByTestId(`cell-${field}`)).getByRole("textbox");
    expect(inputField).toBeInvalid();
    expect(inputField).toHaveAccessibleErrorMessage(feedbackMessage);
  });
}

export function expectFieldsToHaveIconAndToHaveAccessibleName(fields: Array<string>, accessibleName: string) {
  fields.forEach((field) => {
    const icon = within(screen.getByTestId(`cell-${field}`)).getByRole("img");
    expect(icon).toHaveAccessibleName(accessibleName);
  });
}

export function expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(fields: Array<string>) {
  fields.forEach((field) => {
    const inputField = within(screen.getByTestId(`cell-${field}`)).getByRole("textbox");
    expect(inputField).toBeValid();
    expect(inputField).not.toHaveAccessibleErrorMessage();
  });
}

export function expectFieldsToNotHaveIcon(fields: Array<string>) {
  fields.forEach((field) => {
    const icon = within(screen.getByTestId(`cell-${field}`)).queryByRole("img");
    expect(icon).toBeNull();
  });
}
