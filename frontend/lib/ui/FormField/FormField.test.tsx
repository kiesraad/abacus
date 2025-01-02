import { describe, expect, test } from "vitest";

import { render, within } from "@kiesraad/test";

import { DefaultFormField } from "./FormField.stories";

describe("UI component: FormField", () => {
  test("FormField without error or warning has expected children", () => {
    const { getByTestId } = render(<DefaultFormField hasError={false} hasWarning={false} />);
    const el = getByTestId("test-form-field");
    expect(el).toBeInTheDocument();
    expect(getByTestId("test-input")).toBeInTheDocument();
  });

  test("FormField with error and warning has expected children", () => {
    const { getByTestId } = render(<DefaultFormField hasError={true} hasWarning={true} />);

    const el = getByTestId("test-form-field");
    expect(el).toBeInTheDocument();
    expect(within(el).getByRole("img")).toHaveAccessibleName("bevat een fout");
    expect(getByTestId("test-input")).toBeInTheDocument();
  });

  test("FormField with error and without warning has expected children", () => {
    const { getByTestId } = render(<DefaultFormField hasError={true} hasWarning={false} />);

    const el = getByTestId("test-form-field");
    expect(el).toBeInTheDocument();
    expect(within(el).getByRole("img")).toHaveAccessibleName("bevat een fout");
    expect(getByTestId("test-input")).toBeInTheDocument();
  });

  test("FormField without error and with warning has expected children", () => {
    const { getByTestId } = render(<DefaultFormField hasError={false} hasWarning={true} />);

    const el = getByTestId("test-form-field");
    expect(el).toBeInTheDocument();
    expect(within(el).getByRole("img")).toHaveAccessibleName("bevat een waarschuwing");
    expect(getByTestId("test-input")).toBeInTheDocument();
  });
});
