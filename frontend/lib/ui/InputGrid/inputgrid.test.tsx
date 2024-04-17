import { render, screen } from "@testing-library/react";
import { InputGrid } from "./InputGrid";
import { describe, expect, test } from "vitest";
import { userEvent } from "@testing-library/user-event";

const component = (
  <InputGrid>
    <InputGrid.Header>
      <th>Veld</th>
      <th>Geteld aantal</th>
      <th>Omschrijving</th>
    </InputGrid.Header>
    <InputGrid.Body>
      <InputGrid.Row>
        <td>A</td>
        <td>
          <input id="input1" defaultValue={1} />
        </td>
        <td>Input field 1</td>
      </InputGrid.Row>

      <InputGrid.Seperator />

      <InputGrid.Row>
        <td>B</td>
        <td>
          <input id="input2" defaultValue={2} />
        </td>
        <td>Input field 2</td>
      </InputGrid.Row>

      <InputGrid.Row>
        <td>C</td>
        <td>
          <input id="input3" defaultValue={3} />
        </td>
        <td>Input field 3</td>
      </InputGrid.Row>
    </InputGrid.Body>
  </InputGrid>
);

describe("InputGrid", () => {
  test("InputGrid renders", () => {
    render(component);
    expect(true).toBe(true);
  });

  test("Row has focused class when input has focus", () => {
    render(component);

    const firstInput = screen.getByTestId("input1");
    firstInput.focus();
    expect(firstInput.parentElement?.parentElement).toHaveClass("focused");

    const secondInput = screen.getByTestId("input2");
    secondInput.focus();
    expect(firstInput.parentElement?.parentElement).not.toHaveClass("focused");
    expect(secondInput.parentElement?.parentElement).toHaveClass("focused");
  });

  test("Move focus arrow up and down and tab and enter", async () => {
    render(component);

    const firstInput = screen.getByTestId("input1");
    const secondInput = screen.getByTestId("input2");
    const thirdInput = screen.getByTestId("input3");

    firstInput.focus();

    await userEvent.keyboard("{arrowdown}");

    expect(secondInput).toHaveFocus();

    await userEvent.keyboard("{arrowup}");

    expect(firstInput).toHaveFocus();

    await userEvent.keyboard("{tab}");

    expect(secondInput).toHaveFocus();

    await userEvent.keyboard("{enter}");

    expect(thirdInput).toHaveFocus();
  });
});
