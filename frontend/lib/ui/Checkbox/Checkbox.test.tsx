import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Checkbox } from "./Checkbox";

describe("UI component: Checkbox", () => {
  test("The checkbox renders with label", () => {
    render(
      <Checkbox id="test-id" defaultChecked={false}>
        Test label
      </Checkbox>,
    );

    expect(screen.getByText("Test label")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
    expect(screen.queryByLabelText("Aangevinkt")).not.toBeInTheDocument();
  });

  test("The checkbox is checked", () => {
    render(
      <Checkbox id="test-id" defaultChecked={true}>
        Test label
      </Checkbox>,
    );

    expect(screen.getByTestId("test-id")).toBeChecked();
    expect(screen.getByLabelText("Aangevinkt")).toBeInTheDocument();
  });
});
