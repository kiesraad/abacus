import { within } from "@testing-library/dom";
import { describe, expect, test } from "vitest";

import { render, screen } from "app/test/unit";

import { ErrorsAndWarnings, FieldValidationResult } from "@kiesraad/api";
import { InputGrid, InputGridRow, InputGridRowProps } from "@kiesraad/ui";

const defaultProps: InputGridRowProps = {
  id: "this-row-id",
  field: "field",
  title: "title",
};

const renderRow = (extraProps: Partial<InputGridRowProps> = {}) =>
  render(
    <InputGrid>
      <InputGrid.Body>
        <InputGridRow {...defaultProps} {...extraProps} />
      </InputGrid.Body>
    </InputGrid>,
  );

const FIELD_ERROR: FieldValidationResult = { code: "F101", id: "id-f101" };
const FIELD_WARNING: FieldValidationResult = { code: "W201", id: "id-w201" };

describe("InputGridRow", () => {
  test("InputGridRow renders a table row", async () => {
    renderRow();

    const rows = await screen.findAllByRole("row");
    expect(rows.length).toBe(1);
  });

  test("InputGridRow renders a ListTotal in case of isListTotal", async () => {
    renderRow({ isListTotal: true });

    const rows = await screen.findAllByRole("row");
    expect(rows.length).toBe(2);
    expect(rows[0]).toHaveClass("sep_total");
    expect(rows[1]).toHaveClass("list_total");
  });

  test("InputGridRow uses aria-errormessage", async () => {
    render(
      <>
        <InputGrid>
          <InputGrid.Body>
            <InputGridRow {...defaultProps} errorMessageId="some-error" />
          </InputGrid.Body>
        </InputGrid>
        <div id="some-error">Some error</div>
      </>,
    );

    const input = await within(await screen.findByRole("row")).findByRole("textbox");
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleErrorMessage("Some error");
  });

  test("InputGridRow shows errors for this row", async () => {
    const errorsAndWarnings: Map<string, ErrorsAndWarnings> = new Map();
    errorsAndWarnings.set("this-row-id", {
      errors: [FIELD_ERROR],
      warnings: [],
    });

    renderRow({ errorsAndWarnings });

    const input = await within(await screen.findByRole("row")).findByRole("textbox");
    expect(input).toBeInvalid();
    expect(input).toHaveAttribute("aria-errormessage", "feedback-error");
  });

  test("InputGridRow does not show errors for another row", async () => {
    const errorsAndWarnings: Map<string, ErrorsAndWarnings> = new Map();
    errorsAndWarnings.set("another-row-id", {
      errors: [FIELD_ERROR],
      warnings: [],
    });

    renderRow({ errorsAndWarnings });

    const input = await within(await screen.findByRole("row")).findByRole("textbox");
    expect(input).not.toBeInvalid();
    expect(input).not.toHaveAttribute("aria-errormessage");
  });

  test("InputGridRow shows warnings for this row", async () => {
    const errorsAndWarnings: Map<string, ErrorsAndWarnings> = new Map();
    errorsAndWarnings.set("this-row-id", {
      errors: [],
      warnings: [FIELD_WARNING],
    });

    renderRow({ errorsAndWarnings });

    const input = await within(await screen.findByRole("row")).findByRole("textbox");
    expect(input).toBeInvalid();
    expect(input).toHaveAttribute("aria-errormessage", "feedback-warning");
  });

  test("InputGridRow does not show warnings for another row", async () => {
    const errorsAndWarnings: Map<string, ErrorsAndWarnings> = new Map();
    errorsAndWarnings.set("another-row-id", {
      errors: [],
      warnings: [FIELD_WARNING],
    });

    renderRow({ errorsAndWarnings });

    const input = await within(await screen.findByRole("row")).findByRole("textbox");
    expect(input).not.toBeInvalid();
    expect(input).not.toHaveAttribute("aria-errormessage");
  });

  test("InputGridRow does not show warnings if warnings are accepted", async () => {
    const errorsAndWarnings: Map<string, ErrorsAndWarnings> = new Map();
    errorsAndWarnings.set("another-row-id", {
      errors: [],
      warnings: [FIELD_WARNING],
    });

    renderRow({ errorsAndWarnings, warningsAccepted: true });

    const input = await within(await screen.findByRole("row")).findByRole("textbox");
    expect(input).not.toBeInvalid();
    expect(input).not.toHaveAttribute("aria-errormessage");
  });

  test("InputGridRow shows errors and warnings for this row", async () => {
    const errorsAndWarnings: Map<string, ErrorsAndWarnings> = new Map();
    errorsAndWarnings.set("this-row-id", {
      errors: [FIELD_ERROR],
      warnings: [FIELD_WARNING],
    });

    renderRow({ errorsAndWarnings });

    const input = await within(await screen.findByRole("row")).findByRole("textbox");
    expect(input).toBeInvalid();
    expect(input).toHaveAttribute("aria-errormessage", "feedback-error");
  });
});
