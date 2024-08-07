import { describe, expect, test } from "vitest";

import { render } from "app/test/unit";

import { DefaultFormField } from "./FormField.stories";

describe("UI component: FormField", () => {
  test("FormField has expected children", () => {
    const { getByTestId } = render(<DefaultFormField error="IncorrectTotal" />);

    expect(getByTestId("test-input")).toBeInTheDocument();
  });
});
