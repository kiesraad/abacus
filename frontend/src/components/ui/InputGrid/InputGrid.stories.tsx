import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import { InputGrid } from "./InputGrid";
import { InputGridRow } from "./InputGridRow";

type Props = {
  readOnly: boolean;
  zebra: boolean;
  addSeparator: boolean;
  isListTotal: boolean;
  isTotal: boolean;
};

// Create error and warning maps for the stories
const createErrorsAndWarnings = () => {
  const errorsAndWarnings = new Map<string, "error" | "warning">();
  errorsAndWarnings.set("input2", "error");
  errorsAndWarnings.set("input3", "warning");
  errorsAndWarnings.set("zebra2", "error");
  errorsAndWarnings.set("zebra4", "warning");
  errorsAndWarnings.set("zebra5", "error");
  return errorsAndWarnings;
};

export const DefaultGrid: StoryObj<Props> = {
  args: {
    readOnly: false,
    zebra: false,
    addSeparator: false,
    isTotal: true,
  },
  render: ({ readOnly, zebra, addSeparator, isTotal }) => {
    const errorsAndWarnings = createErrorsAndWarnings();

    return (
      <InputGrid zebra={zebra}>
        <InputGrid.Header field="Veld" value="Geteld aantal" title="Omschrijving" />
        <InputGrid.Body>
          <InputGridRow
            readOnly={readOnly}
            id="input1"
            field="A"
            title="Input field 1"
            value={1}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="input2"
            field="B"
            title="Input field 2 (Error)"
            value={200}
            errorsAndWarnings={errorsAndWarnings}
            addSeparator={addSeparator}
          />
          <InputGridRow
            readOnly={readOnly}
            id="input3"
            field="C"
            title="Input field 3 (Warning)"
            value={3000}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="total"
            field="D"
            title="Total of all inputs"
            value={6000}
            isTotal={isTotal}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGrid.Separator />
          <InputGridRow
            readOnly={readOnly}
            id="input4"
            field="E"
            title="Input field 4"
            errorsAndWarnings={errorsAndWarnings}
          />
        </InputGrid.Body>
      </InputGrid>
    );
  },

  play: async ({ canvas, canvasElement }) => {
    // Test that the grid table is visible - table has role="none" so use querySelector
    const grid = canvasElement.querySelector("table");
    await expect(grid).toBeVisible();
    const input3 = canvas.getByTestId("input3");
    await expect(input3).toHaveValue("3000");
    const input3Overlay = canvas.getByTestId("input3-formatted-overlay");
    await expect(input3Overlay).toHaveTextContent("3.000");
  },
};

export const DefaultGridReadOnly: StoryObj<Props> = {
  args: {
    readOnly: true,
    zebra: false,
    addSeparator: false,
    isTotal: true,
  },
  render: ({ readOnly, zebra, addSeparator, isTotal }) => {
    const errorsAndWarnings = createErrorsAndWarnings();

    return (
      <InputGrid zebra={zebra}>
        <InputGrid.Header field="Veld" value="Geteld aantal" title="Omschrijving" />
        <InputGrid.Body>
          <InputGridRow
            readOnly={readOnly}
            id="input1"
            field="A"
            title="Input field 1"
            value={1}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="input2"
            field="B"
            title="Input field 2 (Error)"
            value={200}
            errorsAndWarnings={errorsAndWarnings}
            addSeparator={addSeparator}
          />
          <InputGridRow
            readOnly={readOnly}
            id="input3"
            field="C"
            title="Input field 3 (Warning)"
            value={3000}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="total"
            field="D"
            title="Total of all inputs"
            value={6000}
            isTotal={isTotal}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGrid.Separator />
          <InputGridRow
            readOnly={readOnly}
            id="input4"
            field="E"
            title="Input field 4"
            errorsAndWarnings={errorsAndWarnings}
          />
        </InputGrid.Body>
      </InputGrid>
    );
  },

  play: async ({ canvas, canvasElement }) => {
    // Test that the grid table is visible - table has role="none" so use querySelector
    const grid = canvasElement.querySelector("table");
    await expect(grid).toBeVisible();
    const input3 = canvas.getByTestId("value-input3");
    await expect(input3).toHaveTextContent("3.000");
  },
};

export const CandidatesGrid: StoryObj<Props> = {
  args: {
    readOnly: false,
    zebra: true,
    isListTotal: true,
  },
  render: ({ readOnly, zebra, isListTotal }) => {
    const errorsAndWarnings = createErrorsAndWarnings();

    return (
      <InputGrid zebra={zebra}>
        <InputGrid.Header field="Nummer" value="Aantal stemmen" title="Kandidaat" />
        <InputGrid.Body>
          <InputGridRow
            readOnly={readOnly}
            id="zebra1"
            field="1"
            title="Jacobse, F."
            value={1}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="zebra2"
            field="2"
            title="Van Es, T.J. (Error)"
            value={200}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="zebra3"
            field="3"
            title="Van Es, K."
            value={3000}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="zebra4"
            field="4"
            title="Van Yvonne, T. (Warning)"
            value={4000}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="zebra5"
            field="5"
            title="Van Yvonne, W. (Error)"
            value={5000}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="zebra-list-total"
            field=""
            title="List Total"
            value={15000}
            isListTotal={isListTotal}
            errorsAndWarnings={errorsAndWarnings}
          />
        </InputGrid.Body>
      </InputGrid>
    );
  },
};

export const GridWithPreviousValues: StoryObj<Props> = {
  args: {
    readOnly: false,
    zebra: false,
    addSeparator: false,
    isTotal: true,
  },
  render: ({ readOnly, zebra, addSeparator, isTotal }) => {
    const errorsAndWarnings = createErrorsAndWarnings();

    return (
      <InputGrid zebra={zebra}>
        <InputGrid.Header field="Veld" previous="Vorig aantal" value="Geteld aantal" title="Omschrijving" />
        <InputGrid.Body>
          <InputGridRow
            readOnly={readOnly}
            id="input1"
            field="A"
            title="Input field 1"
            previousValue={"1111"}
            value={""}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="input2"
            field="B"
            title="Input field 2 (Error)"
            previousValue={"12"}
            value={"0"}
            errorsAndWarnings={errorsAndWarnings}
            addSeparator={addSeparator}
          />
          <InputGridRow
            readOnly={readOnly}
            id="input3"
            field="C"
            title="Input field 3 (Warning)"
            previousValue={"13"}
            value={"1010"}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="total"
            field="D"
            title="Total of all inputs"
            previousValue={"36"}
            value={""}
            isTotal={isTotal}
            errorsAndWarnings={errorsAndWarnings}
          />
        </InputGrid.Body>
      </InputGrid>
    );
  },

  play: async ({ canvas, canvasElement }) => {
    // Test that the grid table is visible - table has role="none" so use querySelector
    const grid = canvasElement.querySelector("table");
    await expect(grid).toBeVisible();
    const previousInput1 = canvas.getByTestId("previous-input1");
    await expect(previousInput1).toHaveTextContent("1.111");
    const input3 = canvas.getByTestId("input3");
    await expect(input3).toHaveValue("1010");
    const input3Overlay = canvas.getByTestId("input3-formatted-overlay");
    await expect(input3Overlay).toHaveTextContent("1.010");
  },
};

export default {
  argTypes: {
    readOnly: {
      control: { type: "boolean" },
    },
  },
} satisfies Meta<Props>;
