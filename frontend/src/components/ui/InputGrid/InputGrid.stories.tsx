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
            value={2}
            errorsAndWarnings={errorsAndWarnings}
            addSeparator={addSeparator}
          />
          <InputGridRow
            readOnly={readOnly}
            id="input3"
            field="C"
            title="Input field 3 (Warning)"
            value={3}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="total"
            field="D"
            title="Total of all inputs"
            value={6}
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

  play: async ({ canvasElement }) => {
    // Test that the grid table is visible - table has role="none" so use querySelector
    const grid = canvasElement.querySelector("table");
    await expect(grid).toBeVisible();
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
            value={2}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="zebra3"
            field="3"
            title="Van Es, K."
            value={3}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="zebra4"
            field="4"
            title="Van Yvonne, T. (Warning)"
            value={4}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="zebra5"
            field="5"
            title="Van Yvonne, W. (Error)"
            value={5}
            errorsAndWarnings={errorsAndWarnings}
          />
          <InputGridRow
            readOnly={readOnly}
            id="zebra-list-total"
            field=""
            title="List Total"
            value={15}
            isListTotal={isListTotal}
            errorsAndWarnings={errorsAndWarnings}
          />
        </InputGrid.Body>
      </InputGrid>
    );
  },
};

export default {
  argTypes: {
    readOnly: {
      control: { type: "boolean" },
    },
  },
} satisfies Meta<Props>;
