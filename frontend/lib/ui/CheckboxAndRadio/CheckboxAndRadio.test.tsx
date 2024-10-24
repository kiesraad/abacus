import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { Checkbox, Radio } from "@kiesraad/ui";

describe("UI component: Checkbox", () => {
  test("The checkbox renders with label", () => {
    render(<Checkbox id="test-id" defaultChecked={false} label="Test label" />);

    expect(screen.getByText("Test label")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
  });

  test("The checkbox renders with label and description", () => {
    render(
      <Checkbox id="test-id" defaultChecked={false} label="Test label">
        Test description
      </Checkbox>,
    );

    expect(screen.getByText("Test label")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
  });

  test("The checkbox is checked", () => {
    render(<Checkbox id="test-id" defaultChecked={true} label="Test label" />);

    expect(screen.getByTestId("test-id")).toBeChecked();
  });

  test("The checkbox toggles", async () => {
    render(<Checkbox id="test-id" defaultChecked={false} label="Test label" />);

    const element = screen.getByTestId("test-id");

    expect(element).not.toBeChecked();

    const user = userEvent.setup();

    await user.click(element);

    expect(element).toBeChecked();

    await user.click(element);

    expect(element).not.toBeChecked();
  });
});

describe("UI component: Checkbox Indeterminate", () => {
  test("The checkbox indeterminate renders with label", () => {
    render(<Checkbox id="test-id" defaultChecked={false} label="Test label" indeterminate />);

    expect(screen.getByText("Test label")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
  });

  test("The checkbox indeterminate renders with label and description", () => {
    render(
      <Checkbox id="test-id" defaultChecked={false} label="Test label" indeterminate>
        Test description
      </Checkbox>,
    );

    expect(screen.getByText("Test label")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
  });

  test("The checkbox indeterminate is checked", () => {
    render(<Checkbox id="test-id" defaultChecked={true} label="Test label" indeterminate />);

    expect(screen.getByTestId("test-id")).toBeChecked();
  });

  test("The checkbox indeterminate toggles", async () => {
    render(<Checkbox id="test-id" defaultChecked={false} label="Test label" indeterminate />);

    const element = screen.getByTestId("test-id");

    expect(element).not.toBeChecked();

    const user = userEvent.setup();

    await user.click(element);

    expect(element).toBeChecked();

    await user.click(element);

    expect(element).not.toBeChecked();
  });
});

describe("UI component: Radio", () => {
  test("The radio renders with label", () => {
    render(<Radio id="test-id" defaultChecked={false} label="Test label" />);

    expect(screen.getByText("Test label")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
  });

  test("The radio renders with label and description", () => {
    render(
      <Radio id="test-id" defaultChecked={false} label="Test label">
        Test description
      </Radio>,
    );

    expect(screen.getByText("Test label")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();

    expect(screen.getByTestId("test-id")).not.toBeChecked();
  });

  test("The radio is checked", () => {
    render(<Radio id="test-id" defaultChecked={true} label="Test label" />);

    expect(screen.getByTestId("test-id")).toBeChecked();
  });

  test("The radio toggles", async () => {
    render(<Radio id="test-id" defaultChecked={false} label="Test label" />);

    const element = screen.getByTestId("test-id");

    expect(element).not.toBeChecked();

    const user = userEvent.setup();

    await user.click(element);

    expect(element).toBeChecked();
  });
});
