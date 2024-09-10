import { within } from "@testing-library/react";
import { expect } from "vitest";

export function expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(
  fields: Array<HTMLElement>,
  feedbackMessage: string,
) {
  fields.forEach((field) => {
    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleErrorMessage(feedbackMessage);
  });
}

export function expectFieldsToHaveIconAndToHaveAccessibleName(fields: Array<HTMLElement>, accessibleName: string) {
  fields.forEach((field) => {
    expect(within(field.previousElementSibling as HTMLElement).getByRole("img")).toHaveAccessibleName(accessibleName);
  });
}

export function expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(fields: Array<HTMLElement>) {
  fields.forEach((field) => {
    expect(field).toBeValid();
    expect(field).not.toHaveAccessibleErrorMessage();
  });
}

export function expectFieldsToNotHaveIcon(fields: Array<HTMLElement>) {
  fields.forEach((field) => {
    expect(within(field.previousElementSibling as HTMLElement).queryByRole("img")).toBeNull();
  });
}
