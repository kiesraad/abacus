import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing";

import { DefaultChoiceListCheckbox } from "./ChoiceList.stories";

describe("UI component: ChoiceList", () => {
  test("The choicelist renders with title", () => {
    render(<DefaultChoiceListCheckbox label={"Test label"} />);

    expect(screen.getByText("ChoiceList Checkbox Title")).toBeInTheDocument();
  });
  test("The choicelist renders with error", () => {
    render(<DefaultChoiceListCheckbox label={"Test label"} error="Test error" />);

    expect(screen.getByText("Test error")).toBeInTheDocument();
  });
});
