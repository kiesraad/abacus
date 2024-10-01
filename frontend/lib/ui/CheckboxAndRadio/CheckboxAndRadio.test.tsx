import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { CheckboxAndRadio } from "@kiesraad/ui";

describe("UI component: Checkbox", () => {
  test("The checkbox renders with label", () => {
    render(<CheckboxAndRadio id="test-id" type="checkbox" defaultChecked={false} label="Test label" />);

    expect(screen.getByText("Test label")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
    expect(screen.queryByLabelText("Aangevinkt")).not.toBeInTheDocument();
  });

  test("The checkbox renders with label and description", () => {
    render(
      <CheckboxAndRadio id="test-id" type="checkbox" defaultChecked={false} label="Test label">
        Test description
      </CheckboxAndRadio>,
    );

    expect(screen.getByText("Test label")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
    expect(screen.queryByLabelText("Aangevinkt")).not.toBeInTheDocument();
  });

  test("The checkbox is checked", () => {
    render(<CheckboxAndRadio id="test-id" type="checkbox" defaultChecked={true} label="Test label" />);

    expect(screen.getByTestId("test-id")).toBeChecked();
    expect(screen.getByLabelText("Aangevinkt")).toBeInTheDocument();
  });
  test("The checkbox toggles", async () => {
    render(<CheckboxAndRadio id="test-id" type="checkbox" defaultChecked={true} label="Test label" />);

    expect(screen.getByTestId("test-id")).not.toBeChecked();

    const user = userEvent.setup();

    await user.click(screen.getByTestId("checkbox-button-test-id"));

    expect(screen.getByTestId("test-id")).toBeChecked();

    await user.click(screen.getByTestId("checkbox-button-test-id"));

    expect(screen.getByTestId("test-id")).not.toBeChecked();
  });
});

describe("UI component: Checkbox Indeterminate", () => {
  test("The checkbox indeterminate renders with label", () => {
    render(<CheckboxAndRadio id="test-id" type="checkbox" defaultChecked={false} label="Test label" indeterminate />);

    expect(screen.getByText("Test label")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
    expect(screen.queryByLabelText("Aangevinkt")).not.toBeInTheDocument();
  });

  test("The checkbox indeterminate renders with label and description", () => {
    render(
      <CheckboxAndRadio id="test-id" type="checkbox" defaultChecked={false} label="Test label" indeterminate>
        Test description
      </CheckboxAndRadio>,
    );

    expect(screen.getByText("Test label")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
    expect(screen.queryByLabelText("Aangevinkt")).not.toBeInTheDocument();
  });

  test("The checkbox indeterminate is checked", () => {
    render(<CheckboxAndRadio id="test-id" type="checkbox" defaultChecked={true} label="Test label" indeterminate />);

    expect(screen.getByTestId("test-id")).toBeChecked();
    expect(screen.getByLabelText("Aangevinkt")).toBeInTheDocument();
  });
  test("The checkbox indeterminate toggles", async () => {
    render(<CheckboxAndRadio id="test-id" type="checkbox" defaultChecked={false} label="Test label" indeterminate />);

    expect(screen.getByTestId("test-id")).not.toBeChecked();

    const user = userEvent.setup();

    await user.click(screen.getByTestId("checkbox-button-test-id"));

    expect(screen.getByTestId("test-id")).toBeChecked();

    await user.click(screen.getByTestId("checkbox-button-test-id"));

    expect(screen.getByTestId("test-id")).not.toBeChecked();
  });
});

describe("UI component: Radio", () => {
  test("The radio renders with label", () => {
    render(<CheckboxAndRadio id="test-id" type="radio" defaultChecked={false} label="Test label" />);

    expect(screen.getByText("Test label")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
    expect(screen.queryByLabelText("Aangevinkt")).not.toBeInTheDocument();
  });

  test("The radio renders with label and description", () => {
    render(
      <CheckboxAndRadio id="test-id" type="radio" defaultChecked={false} label="Test label">
        Test description
      </CheckboxAndRadio>,
    );

    expect(screen.getByText("Test label")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
    expect(screen.queryByLabelText("Aangevinkt")).not.toBeInTheDocument();
  });

  test("The radio is checked", () => {
    render(<CheckboxAndRadio id="test-id" type="radio" defaultChecked={true} label="Test label" />);

    expect(screen.getByTestId("test-id")).toBeChecked();
    expect(screen.getByLabelText("Aangevinkt")).toBeInTheDocument();
  });
  test("The radio toggles", async () => {
    render(<CheckboxAndRadio id="test-id" type="radio" defaultChecked={false} label="Test label" />);

    expect(screen.getByTestId("test-id")).not.toBeChecked();

    const user = userEvent.setup();

    await user.click(screen.getByTestId("radio-button-test-id"));

    expect(screen.getByTestId("test-id")).toBeChecked();

    await user.click(screen.getByTestId("radio-button-test-id"));

    expect(screen.getByTestId("test-id")).not.toBeChecked();
  });
});
