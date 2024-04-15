import { render } from "@testing-library/react";
import { InputGrid } from "./InputGrid";
import { expect, test } from "vitest";

test("InputGrid renders", () => {
  render(
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
      </InputGrid.Body>
    </InputGrid>
  );
  expect(true).toBe(true);
});
